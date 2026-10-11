(function () {

    "use strict";

    // ============================================================
    // API SENTINEL CONTENT SCRIPT
    // ============================================================

    console.log("[API Sentinel] Content script loaded");


    // ============================================================
    // INJECT INTERCEPTOR
    // ============================================================

    function injectInterceptor() {

        try {

            // Prevent duplicate interceptor injection
            if (window.__API_SENTINEL_INTERCEPTOR__) {
                console.log(
                    "[API Sentinel] Interceptor already active"
                );
                return;
            }

            const script =
                document.createElement("script");

            script.src =
                chrome.runtime.getURL(
                    "interceptor.js"
                );

            script.onload = function () {

                window.__API_SENTINEL_INTERCEPTOR__ = true;

                console.log(
                    "[API Sentinel] Interceptor injected"
                );

                this.remove();
            };

            script.onerror = function () {

                console.error(
                    "[API Sentinel] Failed to inject interceptor"
                );

                this.remove();
            };

            (
                document.head ||
                document.documentElement
            ).appendChild(script);

        } catch (error) {

            console.debug(
                "[API Sentinel] Interceptor injection failed:",
                error
            );
        }
    }


    // ============================================================
    // SAFE MESSAGE TO BACKGROUND
    // ============================================================

    function sendToBackground(apiData) {

        try {

            // Check whether extension context is still valid
            if (
                !chrome ||
                !chrome.runtime ||
                !chrome.runtime.id
            ) {
                console.debug(
                    "[API Sentinel] Extension context unavailable"
                );

                return;
            }


            chrome.runtime.sendMessage(
                {
                    type: "API_CAPTURED",
                    data: apiData
                },
                function (response) {

                    // IMPORTANT:
                    // Chrome may report the invalidated
                    // extension context through lastError.

                    if (chrome.runtime.lastError) {

                        console.debug(
                            "[API Sentinel] Runtime unavailable:",
                            chrome.runtime.lastError.message
                        );

                        return;
                    }


                    if (response) {

                        console.debug(
                            "[API Sentinel] API captured successfully",
                            response
                        );
                    }

                }
            );

        } catch (error) {

            // Prevent:
            // Uncaught Error: Extension context invalidated

            console.debug(
                "[API Sentinel] Extension context invalidated."
            );
        }
    }


    // ============================================================
    // RECEIVE API DATA FROM INTERCEPTOR
    // ============================================================

    window.addEventListener(
        "message",
        function (event) {

            try {

                // Only accept messages from the same window
                if (
                    event.source !== window
                ) {
                    return;
                }


                if (
                    !event.data
                ) {
                    return;
                }


                if (
                    event.data.source !==
                    "API_SENTINEL"
                ) {
                    return;
                }


                const apiData =
                    event.data.payload;


                if (!apiData) {
                    return;
                }


                console.debug(
                    "[API Sentinel] Captured API:",
                    apiData.method,
                    apiData.url
                );


                sendToBackground(
                    apiData
                );

            } catch (error) {

                console.debug(
                    "[API Sentinel] Message processing error:",
                    error
                );
            }

        }
    );


    // ============================================================
    // START
    // ============================================================

    injectInterceptor();

})();