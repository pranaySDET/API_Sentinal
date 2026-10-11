(function () {

    "use strict";

    console.log("[API Sentinel] Network interceptor loaded");


    // ============================================================
    // UTILITY
    // ============================================================

    function sendToExtension(data) {

        window.postMessage(
            {
                source: "API_SENTINEL",
                payload: data
            },
            "*"
        );

    }


    function safeText(value) {

        if (value === null ||
            value === undefined) {

            return null;
        }

        if (typeof value === "string") {

            return value;
        }

        try {

            return JSON.stringify(value);

        } catch (error) {

            return String(value);

        }

    }


    function resolveUrl(url) {

        try {

            return new URL(
                url,
                window.location.href
            ).href;

        } catch (error) {

            return String(url);

        }

    }


    // ============================================================
    // FETCH INTERCEPTOR
    // ============================================================

    const originalFetch =
        window.fetch;


    window.fetch =
        async function (...args) {

            const startTime =
                performance.now();


            let url = "";

            let method = "GET";

            let requestBody = null;


            try {

                const input = args[0];

                const options =
                    args[1] || {};


                // ----------------------------------------------
                // URL
                // ----------------------------------------------

                if (
                    typeof input === "string"
                ) {

                    url = input;

                }
                else if (
                    input instanceof Request
                ) {

                    url = input.url;

                    method =
                        input.method ||
                        "GET";

                }


                // ----------------------------------------------
                // METHOD
                // ----------------------------------------------

                method =
                    options.method ||
                    method;


                // ----------------------------------------------
                // REQUEST BODY
                // ----------------------------------------------

                if (
                    options.body !==
                    undefined
                ) {

                    requestBody =
                        safeText(
                            options.body
                        );

                }


                // ----------------------------------------------
                // EXECUTE ORIGINAL REQUEST
                // ----------------------------------------------

                const response =
                    await originalFetch.apply(
                        this,
                        args
                    );


                const responseTime =
                    Math.round(
                        performance.now() -
                        startTime
                    );


                // ----------------------------------------------
                // READ RESPONSE
                // ----------------------------------------------

                let responseBody = "";

                try {

                    responseBody =
                        await response
                            .clone()
                            .text();

                }
                catch (error) {

                    responseBody =
                        "[Unable to read response body]";

                }


                // ----------------------------------------------
                // SEND DATA
                // ----------------------------------------------

                sendToExtension({

                    type:
                        "API_CAPTURED",

                    sourceType:
                        "fetch",

                    url:
                        resolveUrl(url),

                    method:
                        String(method)
                            .toUpperCase(),

                    requestBody:
                        requestBody,

                    status:
                        response.status,

                    statusText:
                        response.statusText,

                    responseBody:
                        responseBody,

                    responseTime:
                        responseTime,

                    timestamp:
                        new Date()
                            .toISOString()

                });


                return response;

            }
            catch (error) {

                const responseTime =
                    Math.round(
                        performance.now() -
                        startTime
                    );


                sendToExtension({

                    type:
                        "API_CAPTURED",

                    sourceType:
                        "fetch",

                    url:
                        resolveUrl(url),

                    method:
                        String(method)
                            .toUpperCase(),

                    requestBody:
                        requestBody,

                    status:
                        0,

                    statusText:
                        "NETWORK_ERROR",

                    responseBody:
                        "",

                    responseTime:
                        responseTime,

                    error:
                        error.message,

                    timestamp:
                        new Date()
                            .toISOString()

                });


                throw error;

            }

        };


    // ============================================================
    // XHR INTERCEPTOR
    // ============================================================

    const originalOpen =
        XMLHttpRequest.prototype.open;


    const originalSend =
        XMLHttpRequest.prototype.send;


    XMLHttpRequest.prototype.open =
        function (
            method,
            url,
            ...rest
        ) {

            this._sentinelMethod =
                method;

            this._sentinelUrl =
                url;


            return originalOpen.call(
                this,
                method,
                url,
                ...rest
            );

        };


    XMLHttpRequest.prototype.send =
        function (body) {

            const xhr = this;


            const startTime =
                performance.now();


            xhr._sentinelRequestBody =
                safeText(body);


            xhr.addEventListener(
                "loadend",
                function () {

                    const responseTime =
                        Math.round(
                            performance.now() -
                            startTime
                        );


                    let responseBody = "";


                    try {

                        responseBody =
                            xhr.responseText;

                    }
                    catch (error) {

                        responseBody =
                            "[Unable to read response]";

                    }


                    sendToExtension({

                        type:
                            "API_CAPTURED",

                        sourceType:
                            "xhr",

                        url:
                            resolveUrl(
                                xhr._sentinelUrl
                            ),

                        method:
                            String(
                                xhr._sentinelMethod ||
                                "GET"
                            ).toUpperCase(),

                        requestBody:
                            xhr._sentinelRequestBody,

                        status:
                            xhr.status,

                        statusText:
                            xhr.statusText,

                        responseBody:
                            responseBody,

                        responseTime:
                            responseTime,

                        timestamp:
                            new Date()
                                .toISOString()

                    });

                }
            );


            return originalSend.call(
                this,
                body
            );

        };


})();