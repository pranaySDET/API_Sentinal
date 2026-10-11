(function () {

    const IGNORED_FIELDS = [
        "timestamp",
        "createdAt",
        "updatedAt",
        "createdDate",
        "updatedDate",
        "transactionId",
        "requestId",
        "traceId",
        "sessionId",
        "token",
        "accessToken",
        "refreshToken"
    ];

    function isIgnoredField(key) {

        if (!key) return false;

        const normalized = key.toLowerCase();

        return IGNORED_FIELDS.some(field =>
            normalized === field.toLowerCase()
        );
    }

    function parseJson(value) {

        if (value === null || value === undefined) {
            return null;
        }

        if (typeof value === "object") {
            return value;
        }

        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }

    function normalize(value, key) {

        if (isIgnoredField(key)) {
            return "***IGNORED***";
        }

        if (Array.isArray(value)) {
            return value.map(item => normalize(item));
        }

        if (value && typeof value === "object") {

            const result = {};

            Object.keys(value)
                .sort()
                .forEach(k => {

                    if (!isIgnoredField(k)) {
                        result[k] = normalize(value[k], k);
                    }

                });

            return result;
        }

        return value;
    }

    function compare(previous, current) {

        const differences = [];

        function walk(oldValue, newValue, path) {

            if (
                typeof oldValue === "object" &&
                oldValue !== null &&
                typeof newValue === "object" &&
                newValue !== null
            ) {

                const oldKeys = Array.isArray(oldValue)
                    ? Object.keys(oldValue)
                    : Object.keys(oldValue);

                const newKeys = Array.isArray(newValue)
                    ? Object.keys(newValue)
                    : Object.keys(newValue);

                const keys = new Set([
                    ...oldKeys,
                    ...newKeys
                ]);

                keys.forEach(key => {

                    if (isIgnoredField(key)) {
                        return;
                    }

                    const childPath = path
                        ? `${path}.${key}`
                        : key;

                    const existsOld =
                        Object.prototype.hasOwnProperty.call(oldValue, key);

                    const existsNew =
                        Object.prototype.hasOwnProperty.call(newValue, key);

                    if (!existsOld) {

                        differences.push({
                            type: "ADDED",
                            path: childPath,
                            previous: undefined,
                            current: newValue[key]
                        });

                        return;
                    }

                    if (!existsNew) {

                        differences.push({
                            type: "REMOVED",
                            path: childPath,
                            previous: oldValue[key],
                            current: undefined
                        });

                        return;
                    }

                    walk(
                        oldValue[key],
                        newValue[key],
                        childPath
                    );

                });

                return;
            }

            if (oldValue !== newValue) {

                differences.push({
                    type: "CHANGED",
                    path,
                    previous: oldValue,
                    current: newValue
                });

            }
        }

        walk(previous, current, "");

        return differences;
    }

    function compareResponses(previousResponse, currentResponse) {

        const oldJson = parseJson(previousResponse);
        const newJson = parseJson(currentResponse);

        if (oldJson === null || newJson === null) {

            return {
                isJson: false,
                changed: previousResponse !== currentResponse,
                differences: previousResponse !== currentResponse
                    ? [{
                        type: "CHANGED",
                        path: "response",
                        previous: previousResponse,
                        current: currentResponse
                    }]
                    : []
            };
        }

        const oldNormalized = normalize(oldJson);
        const newNormalized = normalize(newJson);

        const differences = compare(
            oldNormalized,
            newNormalized
        );

        return {
            isJson: true,
            changed: differences.length > 0,
            differences
        };
    }

    window.APISentinelJsonDiff = {
        compareResponses,
        parseJson
    };

})();