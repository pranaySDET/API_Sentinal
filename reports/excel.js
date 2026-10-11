(function () {

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

    function downloadExcel(comparison) {

        if (!comparison) {
            alert("Please compare two regression runs first.");
            return;
        }

        const summary = comparison.summary;
        const results = comparison.results;

        let html = `
        <html>
        <head>
        <meta charset="UTF-8">

        <style>

        table {
            border-collapse: collapse;
            width: 100%;
            font-family: Arial;
        }

        th, td {
            border: 1px solid #999;
            padding: 6px;
            vertical-align: top;
        }

        th {
            font-weight: bold;
        }

        h1, h2 {
            font-family: Arial;
        }

        </style>
        </head>

        <body>

        <h1>API Sentinel V2 - Regression Report</h1>

        <h2>Regression Summary</h2>

        <table>
        <tr><th>Metric</th><th>Count</th></tr>
        <tr><td>APIs Tested</td><td>${summary.apisTested}</td></tr>
        <tr><td>Same Behavior</td><td>${summary.sameBehavior}</td></tr>
        <tr><td>New Failures</td><td>${summary.failures}</td></tr>
        <tr><td>Data Changes</td><td>${summary.dataChanges}</td></tr>
        <tr><td>Performance Issues</td><td>${summary.performanceIssues}</td></tr>
        <tr><td>New APIs</td><td>${summary.newApis}</td></tr>
        <tr><td>Missing APIs</td><td>${summary.missingApis}</td></tr>
        </table>

        <br>

        <h2>API Comparison</h2>

        <table>

        <tr>
            <th>Result</th>
            <th>Method</th>
            <th>URL</th>
            <th>Previous Status</th>
            <th>Current Status</th>
            <th>Previous Time</th>
            <th>Current Time</th>
            <th>Differences</th>
        </tr>
        `;

        results.forEach(item => {

            const previous = item.previous || {};
            const current = item.current || {};
            const api = item.api || {};

            let differences = "";

            if (item.differences) {

                differences = item.differences
                    .map(diff => {

                        return `${diff.path}: ${
                            JSON.stringify(diff.previous)
                        } → ${
                            JSON.stringify(diff.current)
                        }`;

                    })
                    .join("<br>");

            }

            html += `
            <tr>

                <td>
                    ${escapeHtml(item.result)}
                </td>

                <td>
                    ${escapeHtml(
                        api.method || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        api.url || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        previous.status || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        current.status || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        previous.responseTime || ""
                    )} ms
                </td>

                <td>
                    ${escapeHtml(
                        current.responseTime || ""
                    )} ms
                </td>

                <td>
                    ${differences}
                </td>

            </tr>
            `;
        });

        html += `
        </table>

        <br>

        <h2>Evidence</h2>

        `;

        results.forEach((item, index) => {

            html += `
            <h3>
                ${index + 1}. ${escapeHtml(item.result)}
            </h3>

            <b>Method:</b>
            ${escapeHtml(item.api?.method || "")}

            <br>

            <b>URL:</b>
            ${escapeHtml(item.api?.url || "")}

            <br><br>

            <b>Previous Response:</b>

            <pre>
${escapeHtml(
    item.previous?.responseBody || ""
)}
            </pre>

            <b>Current Response:</b>

            <pre>
${escapeHtml(
    item.current?.responseBody || ""
)}
            </pre>

            <hr>
            `;

        });

        html += `
        </body>
        </html>
        `;

        const blob = new Blob(
            [html],
            {
                type: "application/vnd.ms-excel"
            }
        );

        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");

        link.href = url;

        link.download =
            `API-Sentinel-Regression-${Date.now()}.xls`;

        document.body.appendChild(link);

        link.click();

        link.remove();

        URL.revokeObjectURL(url);
    }

    window.APISentinelExcel = {
        downloadExcel
    };

})();