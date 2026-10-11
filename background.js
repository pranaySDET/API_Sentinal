const STORAGE_KEY = "apiSentinelRuns";
const ACTIVE_RUN_KEY = "apiSentinelActiveRun";

const SENSITIVE_KEYS = [
    "password",
    "passwd",
    "token",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "authorization",
    "cookie",
    "patientName",
    "patient_name",
    "patientId",
    "patient_id",
    "phone",
    "mobile",
    "email",
    "dob",
    "dateOfBirth",
    "address"
];


// ============================================================
// SANITIZATION
// ============================================================

function isSensitiveKey(key) {

    if (!key) {
        return false;
    }

    const normalized = String(key)
        .replace(/[-_\s]/g, "")
        .toLowerCase();

    return SENSITIVE_KEYS.some(keyName => {

        const normalizedSensitive =
            keyName
                .replace(/[-_\s]/g, "")
                .toLowerCase();

        return normalized === normalizedSensitive;
    });
}


function sanitize(value) {

    if (
        value === null ||
        value === undefined
    ) {
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

                result[key] =
                    sanitize(value[key]);

            }

        });

        return result;
    }

    return value;
}


function sanitizeText(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return value;
    }

    let result = String(value);

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


// ============================================================
// STORAGE
// ============================================================

async function getRuns() {

    const result =
        await chrome.storage.local.get(
            STORAGE_KEY
        );

    return result[STORAGE_KEY] || [];
}


async function saveRuns(runs) {

    await chrome.storage.local.set({
        [STORAGE_KEY]: runs
    });
}


async function getActiveRun() {

    const result =
        await chrome.storage.local.get(
            ACTIVE_RUN_KEY
        );

    return result[ACTIVE_RUN_KEY] || null;
}


async function saveActiveRun(run) {

    await chrome.storage.local.set({
        [ACTIVE_RUN_KEY]: run
    });
}


async function clearActiveRun() {

    await chrome.storage.local.remove(
        ACTIVE_RUN_KEY
    );
}


// ============================================================
// RUN ID
// ============================================================

function createRunId() {

    const now = new Date();

    const year =
        now.getFullYear();

    const month =
        String(now.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(now.getDate())
            .padStart(2, "0");

    const hours =
        String(now.getHours())
            .padStart(2, "0");

    const minutes =
        String(now.getMinutes())
            .padStart(2, "0");

    const seconds =
        String(now.getSeconds())
            .padStart(2, "0");

    return `RUN-${year}${month}${day}-${hours}${minutes}${seconds}`;
}


// ============================================================
// MESSAGE HANDLER
// ============================================================

chrome.runtime.onMessage.addListener(
    (message, sender, sendResponse) => {

        if (
            !message ||
            !message.type
        ) {
            return;
        }


        // ====================================================
        // START REGRESSION
        // ====================================================

        if (
            message.type === "START_RUN"
        ) {

            const run = {

                id: createRunId(),

                startTime:
                    Date.now(),

                endTime:
                    null,

                tabId:
                    sender.tab?.id || null,

                apis:
                    []

            };


            saveActiveRun(run)
                .then(() => {

                    sendResponse({
                        success: true,
                        run: run
                    });

                })
                .catch(error => {

                    console.error(
                        "Unable to start run:",
                        error
                    );

                    sendResponse({
                        success: false,
                        message:
                            error.message
                    });

                });


            return true;
        }


        // ====================================================
        // STOP REGRESSION
        // ====================================================

        if (
            message.type === "STOP_RUN"
        ) {

            getActiveRun()
                .then(async activeRun => {

                    if (!activeRun) {

                        sendResponse({
                            success: false,
                            message:
                                "No active regression run."
                        });

                        return;
                    }


                    activeRun.endTime =
                        Date.now();


                    const runs =
                        await getRuns();


                    runs.push(activeRun);


                    await saveRuns(
                        runs
                    );


                    await clearActiveRun();


                    sendResponse({
                        success: true,
                        run: activeRun
                    });

                })
                .catch(error => {

                    console.error(
                        "Unable to stop run:",
                        error
                    );

                    sendResponse({
                        success: false,
                        message:
                            error.message
                    });

                });


            return true;
        }


        // ====================================================
        // GET ACTIVE RUN
        // ====================================================

        if (
            message.type ===
            "GET_ACTIVE_RUN"
        ) {

            getActiveRun()
                .then(run => {

                    sendResponse({
                        success: true,
                        run: run
                    });

                })
                .catch(error => {

                    sendResponse({
                        success: false,
                        message:
                            error.message
                    });

                });


            return true;
        }


        // ====================================================
        // GET SAVED RUNS
        // ====================================================

        if (
            message.type === "GET_RUNS"
        ) {

            getRuns()
                .then(runs => {

                    sendResponse({
                        success: true,
                        runs: runs
                    });

                })
                .catch(error => {

                    sendResponse({
                        success: false,
                        message:
                            error.message
                    });

                });


            return true;
        }


        // ====================================================
        // API CAPTURED
        // ====================================================

        if (
            message.type ===
            "API_CAPTURED"
        ) {

            getActiveRun()
                .then(async activeRun => {

                    if (!activeRun) {

                        console.log(
                            "API Sentinel: No active run. API ignored."
                        );

                        sendResponse({
                            success: true,
                            ignored: true
                        });

                        return;
                    }


                    const captured =
                        message.data || {};


                    const api = {

                        id:
                            crypto.randomUUID(),

                        timestamp:
                            captured.timestamp ||
                            Date.now(),

                        method:
                            String(
                                captured.method ||
                                "GET"
                            ).toUpperCase(),

                        url:
                            sanitizeText(
                                captured.url ||
                                ""
                            ),

                        requestBody:
                            sanitizeText(
                                captured.requestBody ||
                                ""
                            ),

                        status:
                            Number(
                                captured.status ||
                                0
                            ),

                        statusText:
                            captured.statusText ||
                            "",

                        responseBody:
                            sanitizeText(
                                captured.responseBody ||
                                ""
                            ),

                        responseTime:
                            Number(
                                captured.responseTime ||
                                0
                            )

                    };


                    activeRun.apis.push(
                        api
                    );


                    // IMPORTANT:
                    // Save after EVERY API capture.
                    // This protects the run if the
                    // service worker restarts.

                    await saveActiveRun(
                        activeRun
                    );


                    console.log(
                        "API Sentinel captured:",
                        api.method,
                        api.url,
                        api.status,
                        api.responseTime + "ms"
                    );


                    sendResponse({
                        success: true,
                        captured: true,
                        apiCount:
                            activeRun.apis.length
                    });

                })
                .catch(error => {

                    console.error(
                        "API capture error:",
                        error
                    );

                    sendResponse({
                        success: false,
                        message:
                            error.message
                    });

                });


            return true;
        }


        // ====================================================
        // CLEAR ALL RUNS
        // ====================================================

        if (
            message.type ===
            "CLEAR_RUNS"
        ) {

            chrome.storage.local
                .remove(STORAGE_KEY)
                .then(() => {

                    sendResponse({
                        success: true
                    });

                })
                .catch(error => {

                    sendResponse({
                        success: false,
                        message:
                            error.message
                    });

                });


            return true;
        }


        // ====================================================
        // DELETE SINGLE RUN
        // ====================================================

        if (
            message.type ===
            "DELETE_RUN"
        ) {

            getRuns()
                .then(async runs => {

                    const filtered =
                        runs.filter(
                            run =>
                                run.id !==
                                message.runId
                        );


                    await saveRuns(
                        filtered
                    );


                    sendResponse({
                        success: true
                    });

                })
                .catch(error => {

                    sendResponse({
                        success: false,
                        message:
                            error.message
                    });

                });


            return true;
        }

    }
);