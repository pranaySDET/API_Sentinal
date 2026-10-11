(function () {

    function apiKey(api) {

        const method = String(api.method || "GET")
            .toUpperCase();

        let url = api.url || "";

        try {

            const parsed = new URL(url);

            // Query parameters are ignored for matching.
            url = parsed.origin + parsed.pathname;

        } catch {
            url = url.split("?")[0];
        }

        return `${method} ${url}`;
    }

    function compareRuns(previousRun, currentRun) {

        const previousApis = previousRun?.apis || [];
        const currentApis = currentRun?.apis || [];

        const previousMap = new Map();
        const currentMap = new Map();

        previousApis.forEach(api => {
            previousMap.set(apiKey(api), api);
        });

        currentApis.forEach(api => {
            currentMap.set(apiKey(api), api);
        });

        const results = [];

        let sameBehavior = 0;
        let failures = 0;
        let dataChanges = 0;
        let performanceIssues = 0;
        let newApis = 0;
        let missingApis = 0;

        // Current APIs
        currentMap.forEach((currentApi, key) => {

            const previousApi = previousMap.get(key);

            if (!previousApi) {

                results.push({
                    type: "NEW_API",
                    result: "NEW API",
                    api: currentApi,
                    previous: null,
                    current: currentApi
                });

                newApis++;
                return;
            }

            const currentStatus = Number(
                currentApi.status || 0
            );

            const previousStatus = Number(
                previousApi.status || 0
            );

            if (
                currentStatus >= 400 ||
                currentStatus === 0
            ) {

                results.push({
                    type: "NEW_FAILURE",
                    result: "NEW FAILURE",
                    api: currentApi,
                    previous: previousApi,
                    current: currentApi
                });

                failures++;
                return;
            }

            let responseDiff = {
                changed: false,
                differences: []
            };

            if (
                window.APISentinelJsonDiff &&
                (
                    previousApi.responseBody !== undefined ||
                    currentApi.responseBody !== undefined
                )
            ) {

                responseDiff =
                    window.APISentinelJsonDiff.compareResponses(
                        previousApi.responseBody || "",
                        currentApi.responseBody || ""
                    );
            }

            const performance =
                window.APISentinelPerformance
                    ? window.APISentinelPerformance.check(
                        previousApi.responseTime,
                        currentApi.responseTime
                    )
                    : {
                        issue: false
                    };

            if (responseDiff.changed) {

                results.push({
                    type: "DATA_CHANGE",
                    result: "DATA CHANGE",
                    api: currentApi,
                    previous: previousApi,
                    current: currentApi,
                    differences: responseDiff.differences
                });

                dataChanges++;
                return;
            }

            if (performance.issue) {

                results.push({
                    type: "PERFORMANCE",
                    result: "PERFORMANCE ISSUE",
                    api: currentApi,
                    previous: previousApi,
                    current: currentApi,
                    performance
                });

                performanceIssues++;
                return;
            }

            if (previousStatus !== currentStatus) {

                results.push({
                    type: "STATUS_CHANGE",
                    result: "STATUS CHANGE",
                    api: currentApi,
                    previous: previousApi,
                    current: currentApi
                });

                dataChanges++;
                return;
            }

            results.push({
                type: "SAME",
                result: "SAME BEHAVIOR",
                api: currentApi,
                previous: previousApi,
                current: currentApi
            });

            sameBehavior++;
        });

        // Missing APIs
        previousMap.forEach((previousApi, key) => {

            if (!currentMap.has(key)) {

                results.push({
                    type: "MISSING_API",
                    result: "API NOT FOUND",
                    api: previousApi,
                    previous: previousApi,
                    current: null
                });

                missingApis++;
            }

        });

        return {
            previousRun,
            currentRun,

            summary: {
                apisTested: currentApis.length,
                sameBehavior,
                failures,
                dataChanges,
                performanceIssues,
                newApis,
                missingApis
            },

            results
        };
    }

    window.APISentinelComparator = {
        compareRuns,
        apiKey
    };

})();