let runs = [];

let selectedComparison = null;

let currentResults = [];

document.addEventListener(
    "DOMContentLoaded",
    () => {

        bindEvents();

        loadRuns();

        checkActiveRun();

    }
);


function bindEvents() {

    document
        .getElementById("startBtn")
        .addEventListener(
            "click",
            startRegression
        );

    document
        .getElementById("stopBtn")
        .addEventListener(
            "click",
            stopRegression
        );

    document
        .getElementById("refreshBtn")
        .addEventListener(
            "click",
            loadRuns
        );

    document
        .getElementById("compareBtn")
        .addEventListener(
            "click",
            compareSelected
        );

    document
        .getElementById("clearBtn")
        .addEventListener(
            "click",
            clearRuns
        );

    document
        .getElementById("searchInput")
        .addEventListener(
            "input",
            renderFilteredResults
        );

    document
        .getElementById("filterSelect")
        .addEventListener(
            "change",
            renderFilteredResults
        );

    document
        .getElementById("excelBtn")
        .addEventListener(
            "click",
            () => {

                if (
                    window.APISentinelExcel
                ) {

                    window.APISentinelExcel
                        .downloadExcel(
                            selectedComparison
                        );
                }

            }
        );

    document
        .getElementById("pdfBtn")
        .addEventListener(
            "click",
            () => {

                if (
                    window.APISentinelPDF
                ) {

                    window.APISentinelPDF
                        .printReport(
                            selectedComparison
                        );
                }

            }
        );

    document
        .getElementById("closeDetailBtn")
        .addEventListener(
            "click",
            () => {

                document
                    .getElementById(
                        "detailSection"
                    )
                    .classList.add("hidden");

            }
        );
}


function sendMessage(message) {

    return new Promise(resolve => {

        chrome.runtime.sendMessage(
            message,
            response => {

                resolve(response);

            }
        );

    });
}


async function startRegression() {

    const response =
        await sendMessage({
            type: "START_RUN"
        });

    if (!response?.success) {
        return;
    }

    setRunningUI(true);

    updateStatus(
        "RUNNING",
        "running"
    );

    resetDashboard();

}


async function stopRegression() {

    const response =
        await sendMessage({
            type: "STOP_RUN"
        });

    if (!response?.success) {
        return;
    }

    setRunningUI(false);

    updateStatus(
        "READY",
        "ready"
    );

    loadRuns();

}


async function checkActiveRun() {

    const response =
        await sendMessage({
            type: "GET_ACTIVE_RUN"
        });

    if (
        response?.success &&
        response.run
    ) {

        setRunningUI(true);

        updateStatus(
            "RUNNING",
            "running"
        );

        updateDashboard(
            response.run
        );

    }

}


function setRunningUI(running) {

    document
        .getElementById("startBtn")
        .disabled = running;

    document
        .getElementById("stopBtn")
        .disabled = !running;

}


function updateStatus(text, className) {

    const badge =
        document.getElementById(
            "statusBadge"
        );

    badge.textContent = text;

    badge.className =
        `badge ${className}`;

}


async function loadRuns() {

    const response =
        await sendMessage({
            type: "GET_RUNS"
        });

    if (!response?.success) {
        return;
    }

    runs = response.runs || [];

    renderRuns();

}


function renderRuns() {

    const container =
        document.getElementById(
            "runsContainer"
        );

    if (!runs.length) {

        container.innerHTML = `
            <div class="empty">
                No regression runs yet.
            </div>
        `;

        updateCompareButton();

        return;
    }

    container.innerHTML = "";

    [...runs]
        .reverse()
        .forEach(run => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "run-card";

            const duration =
                run.endTime
                    ? Math.round(
                        (
                            run.endTime -
                            run.startTime
                        ) / 1000
                    )
                    : 0;

            card.innerHTML = `

                <div class="run-top">

                    <label>

                        <input
                            type="checkbox"
                            class="run-checkbox"
                            data-run-id="${run.id}"
                        >

                        <strong>
                            ${escapeHtml(run.id)}
                        </strong>

                    </label>

                </div>

                <div class="run-info-small">

                    <div>
                        Start:
                        ${formatDate(run.startTime)}
                    </div>

                    <div>
                        APIs:
                        ${run.apis?.length || 0}
                    </div>

                    <div>
                        Duration:
                        ${duration} sec
                    </div>

                </div>

            `;

            container.appendChild(card);

        });


    document
        .querySelectorAll(
            ".run-checkbox"
        )
        .forEach(checkbox => {

            checkbox.addEventListener(
                "change",
                updateCompareButton
            );

        });

    updateCompareButton();

}


function updateCompareButton() {

    const selected =
        document.querySelectorAll(
            ".run-checkbox:checked"
        );

    document
        .getElementById("compareBtn")
        .disabled =
            selected.length !== 2;

}


async function compareSelected() {

    const selectedIds =
        [...document.querySelectorAll(
            ".run-checkbox:checked"
        )]
        .map(
            checkbox =>
                checkbox.dataset.runId
        );

    if (selectedIds.length !== 2) {

        alert(
            "Please select exactly two regression runs."
        );

        return;
    }

    let selectedRuns =
        selectedIds
            .map(
                id =>
                    runs.find(
                        run =>
                            run.id === id
                    )
            )
            .filter(Boolean);

    selectedRuns.sort(
        (a, b) =>
            a.startTime -
            b.startTime
    );

    const previousRun =
        selectedRuns[0];

    const currentRun =
        selectedRuns[1];

    selectedComparison =
        window.APISentinelComparator
            .compareRuns(
                previousRun,
                currentRun
            );

    currentResults =
        selectedComparison.results;

    renderComparison();

}


function renderComparison() {

    const comparisonSection =
        document.getElementById(
            "comparisonSection"
        );

    comparisonSection
        .classList.remove("hidden");


    const runInfo =
        document.getElementById(
            "runInfo"
        );

    runInfo.innerHTML = `

        <div>
            <strong>
                Previous Run:
            </strong>

            ${formatDate(
                selectedComparison
                    .previousRun
                    .startTime
            )}

        </div>

        <div>
            <strong>
                Current Run:
            </strong>

            ${formatDate(
                selectedComparison
                    .currentRun
                    .startTime
            )}

        </div>

    `;


    renderSummary();

    renderFilteredResults();


    document
        .getElementById(
            "reportActions"
        )
        .classList.remove("hidden");


    comparisonSection
        .scrollIntoView({
            behavior: "smooth"
        });

}


function renderSummary() {

    const summary =
        selectedComparison.summary;

    const container =
        document.getElementById(
            "summaryCards"
        );

    container.innerHTML = `

        ${summaryCard(
            "APIs Tested",
            summary.apisTested,
            "blue"
        )}

        ${summaryCard(
            "Same Behavior",
            summary.sameBehavior,
            "green"
        )}

        ${summaryCard(
            "New Failures",
            summary.failures,
            "red"
        )}

        ${summaryCard(
            "Data Changes",
            summary.dataChanges,
            "yellow"
        )}

        ${summaryCard(
            "Performance Issues",
            summary.performanceIssues,
            "orange"
        )}

        ${summaryCard(
            "New APIs",
            summary.newApis,
            "blue"
        )}

        ${summaryCard(
            "Missing APIs",
            summary.missingApis,
            "red"
        )}

    `;

}


function summaryCard(
    title,
    value,
    type
) {

    return `

        <div class="summary-card">

            <div class="summary-title">
                ${title}
            </div>

            <div class="summary-value ${type}">
                ${value}
            </div>

        </div>

    `;
}


function renderFilteredResults() {

    if (!selectedComparison) {
        return;
    }

    const search =
        document
            .getElementById(
                "searchInput"
            )
            .value
            .toLowerCase()
            .trim();

    const filter =
        document
            .getElementById(
                "filterSelect"
            )
            .value;

    const results =
        currentResults.filter(item => {

            const apiText = `
                ${item.api?.method || ""}
                ${item.api?.url || ""}
                ${item.result || ""}
            `.toLowerCase();

            const matchesSearch =
                !search ||
                apiText.includes(search);

            const matchesFilter =
                filter === "ALL" ||
                item.type === filter;

            return (
                matchesSearch &&
                matchesFilter
            );

        });

    renderResults(results);

}


function renderResults(results) {

    const container =
        document.getElementById(
            "resultsContainer"
        );

    if (!results.length) {

        container.innerHTML = `
            <div class="empty">
                No matching APIs found.
            </div>
        `;

        return;
    }

    container.innerHTML = "";

    results.forEach(
        (item, index) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                `result-card ${resultClass(
                    item.type
                )}`;

            card.innerHTML = `

                <div class="result-header">

                    <span class="result-type">
                        ${resultIcon(item.type)}
                        ${escapeHtml(
                            item.result
                        )}
                    </span>

                    <button
                        class="details-btn"
                        data-index="${index}">
                        Details
                    </button>

                </div>

                <div class="api-title">

                    <strong>
                        ${escapeHtml(
                            item.api?.method ||
                            ""
                        )}
                    </strong>

                    ${escapeHtml(
                        item.api?.url ||
                        ""
                    )}

                </div>

                <div class="metrics">

                    <span>
                        Previous:
                        ${
                            item.previous?.status ??
                            "-"
                        }
                    </span>

                    <span>
                        Current:
                        ${
                            item.current?.status ??
                            "-"
                        }
                    </span>

                    <span>
                        Time:
                        ${
                            item.previous?.responseTime ??
                            "-"
                        }
                        →
                        ${
                            item.current?.responseTime ??
                            "-"
                        }
                        ms
                    </span>

                </div>

            `;

            container.appendChild(card);

        }
    );


    container
        .querySelectorAll(
            ".details-btn"
        )
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const item =
                        results[
                            Number(
                                button.dataset.index
                            )
                        ];

                    showDetails(item);

                }
            );

        });

}


function showDetails(item) {

    const section =
        document.getElementById(
            "detailSection"
        );

    const container =
        document.getElementById(
            "detailContainer"
        );

    section.classList.remove(
        "hidden"
    );


    let diffHtml = "";

    if (
        item.differences &&
        item.differences.length
    ) {

        diffHtml = `

            <h3>
                Field Differences
            </h3>

            <table class="diff-table">

                <thead>

                    <tr>
                        <th>Field</th>
                        <th>Previous</th>
                        <th>Current</th>
                    </tr>

                </thead>

                <tbody>

                    ${item.differences
                        .map(diff => `

                            <tr>

                                <td>
                                    ${escapeHtml(
                                        diff.path
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        prettyValue(
                                            diff.previous
                                        )
                                    )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                        prettyValue(
                                            diff.current
                                        )
                                    )}
                                </td>

                            </tr>

                        `)
                        .join("")}

                </tbody>

            </table>

        `;
    }


    container.innerHTML = `

        <div class="detail-block">

            <h3>
                ${resultIcon(item.type)}
                ${escapeHtml(
                    item.result
                )}
            </h3>

            <p>
                <strong>Method:</strong>
                ${escapeHtml(
                    item.api?.method || ""
                )}
            </p>

            <p>
                <strong>URL:</strong>
                ${escapeHtml(
                    item.api?.url || ""
                )}
            </p>

        </div>


        <div class="response-grid">

            <div>

                <h3>
                    Previous
                </h3>

                <div class="status-line">
                    Status:
                    ${item.previous?.status ?? "-"}
                </div>

                <div class="status-line">
                    Response Time:
                    ${
                        item.previous?.responseTime ??
                        "-"
                    } ms
                </div>

                <h4>
                    Request Payload
                </h4>

                <pre>
${escapeHtml(
    formatBody(
        item.previous?.requestBody
    )
)}
                </pre>

                <h4>
                    Response
                </h4>

                <pre>
${escapeHtml(
    formatBody(
        item.previous?.responseBody
    )
)}
                </pre>

            </div>


            <div>

                <h3>
                    Current
                </h3>

                <div class="status-line">
                    Status:
                    ${item.current?.status ?? "-"}
                </div>

                <div class="status-line">
                    Response Time:
                    ${
                        item.current?.responseTime ??
                        "-"
                    } ms
                </div>

                <h4>
                    Request Payload
                </h4>

                <pre>
${escapeHtml(
    formatBody(
        item.current?.requestBody
    )
)}
                </pre>

                <h4>
                    Response
                </h4>

                <pre>
${escapeHtml(
    formatBody(
        item.current?.responseBody
    )
)}
                </pre>

            </div>

        </div>


        ${diffHtml}

    `;


    section.scrollIntoView({
        behavior: "smooth"
    });

}


function updateDashboard(run) {

    const apis =
        run?.apis || [];

    const failures =
        apis.filter(
            api =>
                Number(api.status) >= 400
        ).length;

    const slow =
        apis.filter(
            api =>
                Number(api.responseTime) >= 2000
        ).length;

    document
        .getElementById("apiCount")
        .textContent =
            apis.length;

    document
        .getElementById("failureCount")
        .textContent =
            failures;

    document
        .getElementById("slowCount")
        .textContent =
            slow;

}


function resetDashboard() {

    document
        .getElementById("apiCount")
        .textContent = "0";

    document
        .getElementById("failureCount")
        .textContent = "0";

    document
        .getElementById("slowCount")
        .textContent = "0";

}


function resultClass(type) {

    return {
        NEW_FAILURE: "failure",
        DATA_CHANGE: "data-change",
        PERFORMANCE: "performance",
        NEW_API: "new-api",
        MISSING_API: "missing-api",
        SAME: "same",
        STATUS_CHANGE: "data-change"
    }[type] || "";

}


function resultIcon(type) {

    return {
        NEW_FAILURE: "🔴",
        DATA_CHANGE: "🟡",
        PERFORMANCE: "🟠",
        NEW_API: "🔵",
        MISSING_API: "🔴",
        SAME: "🟢",
        STATUS_CHANGE: "🟡"
    }[type] || "⚪";

}


function formatBody(body) {

    if (
        body === null ||
        body === undefined ||
        body === ""
    ) {
        return "-";
    }

    try {

        return JSON.stringify(
            JSON.parse(body),
            null,
            2
        );

    } catch {

        return String(body);

    }

}


function prettyValue(value) {

    if (
        value === undefined
    ) {
        return "-";
    }

    if (
        typeof value === "object"
    ) {

        return JSON.stringify(
            value
        );

    }

    return String(value);

}


function formatDate(timestamp) {

    if (!timestamp) {
        return "-";
    }

    return new Date(
        timestamp
    ).toLocaleString();

}


function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


async function clearRuns() {

    if (
        !confirm(
            "Delete all regression runs?"
        )
    ) {
        return;
    }

    await sendMessage({
        type: "CLEAR_RUNS"
    });

    selectedComparison = null;

    document
        .getElementById(
            "comparisonSection"
        )
        .classList.add("hidden");

    document
        .getElementById(
            "reportActions"
        )
        .classList.add("hidden");

    loadRuns();

}