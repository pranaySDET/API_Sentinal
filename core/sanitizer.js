(function () {

    const SENSITIVE_KEYS = [
        "password",
        "passwd",
        "token",
        "accesstoken",
        "access_token",
        "refreshtoken",
        "refresh_token",
        "authorization",
        "cookie",
        "patientname",
        "patient_name",
        "patientid",
        "patient_id",
        "phone",
        "mobile",
        "email",
        "dob",
        "dateofbirth",
        "address"
    ];

    function isSensitiveKey(key) {
        if (!key) return false;

        const normalized = String(key)
            .replace(/[-_\s]/g, "")
            .toLowerCase();

        return SENSITIVE_KEYS.some(sensitive =>
            normalized === sensitive.replace(/[-_\s]/g, "").toLowerCase()
        );
    }

    function sanitize(value) {

        if (value === null || value === undefined) {
            return value;
        }

        if (typeof value === "string") {
            return value;
        }

        if (Array.isArray(value)) {
            return value.map(item => sanitize(item));
        }

        if (typeof value === "object") {

            const result = {};

            Object.keys(value).forEach(key => {

                if (isSensitiveKey(key)) {
                    result[key] = "***MASKED***";
                } else {
                    result[key] = sanitize(value[key]);
                }

            });

            return result;
        }

        return value;
    }

    function sanitizeText(text) {

        if (!text) return text;

        let result = String(text);

        // Bearer token
        result = result.replace(
            /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
            "Bearer ***MASKED***"
        );

        // Authorization header
        result = result.replace(
            /("authorization"\s*:\s*")[^"]+/gi,
            '$1***MASKED***'
        );

        // Password
        result = result.replace(
            /("password"\s*:\s*")[^"]+/gi,
            '$1***MASKED***'
        );

        return result;
    }

    window.APISentinelSanitizer = {
        sanitize,
        sanitizeText,
        isSensitiveKey
    };

})();