(function () {

    function printReport(comparison) {

        if (!comparison) {
            alert("Please compare two regression runs first.");
            return;
        }

        const summary = comparison.summary;
        const results = comparison.results;

        let html = `
        <!DOCTYPE html>

        <html>

        <head>

        <title>API Sentinel V2 Report</title>

        <style>

        body {
            font-family: Arial, sans-serif;
            margin: 30px;
            color: #222;
        }

        h1 {
            margin-bottom: 5px;
        }

        .subtitle {
            color: #666;
            margin-bottom: 25px;
        }

        .summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 25px;
        }

        .card {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
        }

        .number {
            font-size: 25px;
            font-weight: bold;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin-top: 15px;
        }

        th, td {
            border: 1px solid #ccc;
            padding: 7px;
            text-align: left;
            vertical-align: top;
        }

        th {
            font-weight: bold;
        }

        pre {
            background: #f5f5f5;
            padding: 10px;
            white-space: pre-wrap;
            word-break: break-word;
        }

        .evidence {
            page-break-inside: avoid;
            margin-top: 25px;
        }

        </style>

        </head>

        <body>

        <h1>API Sentinel V2</h1>

        <div class="subtitle">
            API Regression Report
        </div>

        <div class="summary">

            <div class="card">
                APIs Tested
                <div class="number">
                    ${summary.apisTested}
                </div>
            </div>

            <div class="card">
                Same Behavior
                <div class="number">
                    ${summary.sameBehavior}
                </div>
            </div>

            <div class="card">
                New Failures
                <div class="number">
                    ${summary.failures}
                </div>
            </div>

            <div class="card">
                Data Changes
                <div class="number">
                    ${summary.dataChanges}
                </div>
            </div>

            <div class="card">
                Performance
                <div class="number">
                    ${summary.performanceIssues}
                </div>
            </div>

            <div class="card">
                New APIs
                <div class="number">
                    ${summary.newApis}
                </div>
            </div>

        </div>

        <h2>API Comparison</h2>

        <table>

        <tr>
            <th>Result</th>
            <th>Method</th>
            <th>URL</th>
            <th>Previous</th>
            <th>Current</th>
            <th>Previous Time</th>
            <th>Current Time</th>
        </tr>
        `;

        results.forEach(item => {

            html += `
            <tr>

                <td>
                    ${escapeHtml(item.result)}
                </td>

                <td>
                    ${escapeHtml(
                        item.api?.method || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.api?.url || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.previous?.status || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.current?.status || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        item.previous?.responseTime || ""
                    )} ms
                </td>

                <td>
                    ${escapeHtml(
                        item.current?.responseTime || ""
                    )} ms
                </td>

            </tr>
            `;
        });

        html += `
        </table>

        <h2>Detailed Evidence</h2>
        `;

        results.forEach((item, index) => {

            let diffHtml = "";

            if (item.differences?.length) {

                diffHtml = `
                <h4>Differences</h4>

                <ul>

                ${item.differences.map(diff => `

                    <li>

                        <b>
                            ${escapeHtml(diff.path)}
                        </b>

                        :
                        ${escapeHtml(
                            JSON.stringify(diff.previous)
                        )}

                        →

                        ${escapeHtml(
                            JSON.stringify(diff.current)
                        )}

                    </li>

                `).join("")}

                </ul>
                `;
            }

            html += `
            <div class="evidence">

                <h3>
                    ${index + 1}.
                    ${escapeHtml(item.result)}
                </h3>

                <b>Method:</b>
                ${escapeHtml(
                    item.api?.method || ""
                )}

                <br>

                <b>URL:</b>
                ${escapeHtml(
                    item.api?.url || ""
                )}

                ${diffHtml}

                <h4>Previous Response</h4>

                <pre>
${escapeHtml(
    item.previous?.responseBody || ""
)}
                </pre>

                <h4>Current Response</h4>

                <pre>
${escapeHtml(
    item.current?.responseBody || ""
)}
                </pre>

            </div>
            `;
        });

        html += `
        </body>
        </html>
        `;

        const printWindow = window.open(
            "",
            "_blank"
        );

        if (!printWindow) {

            alert(
                "Please allow popups for API Sentinel."
            );

            return;
        }

        printWindow.document.open();

        printWindow.document.write(html);

        printWindow.document.close();

        printWindow.focus();

        setTimeout(() => {

            printWindow.print();

        }, 500);
    }

    function escapeHtml(value) {

        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;");
    }

    window.APISentinelPDF = {
        printReport
    };

})();