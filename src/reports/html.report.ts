    import {
    JIRA_URL
    } from '../config/jira.config';

    import {
    Report
    } from '../types/report.types';

    import {
    escapeHtml,
    getStatusClass
    } from '../utils/html.utils';


    export function createHtmlReport(
    reports: Report[]
    ): string {

    const reportsHtml =
        reports
        .map(
            report => {


            const statusesHtml =
                report.executionStatuses
                .map(
                    item => `

                    <div
                        class="status-card ${getStatusClass(item.status)}"
                    >

                        <div class="status-number">
                        ${item.quantidade}
                        </div>

                        <div class="status-name">
                        ${escapeHtml(item.status)}
                        </div>

                    </div>

                    `
                )
                .join('');


            const relations =
                [
                ...new Set(
                    report.issueLinks.map(
                    issue =>
                        issue.relation
                    )
                )
                ];


            const linksHtml =
                relations
                .map(
                    relation => {


                    const issues =
                        report.issueLinks.filter(
                        issue =>
                            issue.relation ===
                            relation
                        );


                    const rows =
                        issues
                        .map(
                            issue => `

                            <tr>

                                <td class="prit">

                                <a
                                    href="${JIRA_URL}/browse/${issue.prit}"
                                >

                                    ${escapeHtml(issue.prit)}

                                </a>

                                </td>

                                <td>

                                ${escapeHtml(issue.titulo)}

                                </td>

                                <td>

                                <span class="issue-status">

                                    ${escapeHtml(issue.status)}

                                </span>

                                </td>

                            </tr>

                            `
                        )
                        .join('');


                    return `

                        <div class="relation">

                        <strong>
                            ${escapeHtml(relation)}
                        </strong>

                        <table>

                            <thead>

                            <tr>

                                <th>PRIT</th>

                                <th>Title</th>

                                <th>Status</th>

                            </tr>

                            </thead>

                            <tbody>

                            ${rows}

                            </tbody>

                        </table>

                        </div>

                    `;

                    }
                )
                .join('');


            return `

                <section class="report">

                <header>

                    <div>

                    <div class="prit-header">

                        <a
                        href="${JIRA_URL}/browse/${report.prit}"
                        >

                        ${escapeHtml(report.prit)}

                        </a>

                    </div>

                    <h2>

                        ${escapeHtml(report.title)}

                    </h2>

                    </div>


                    <div class="total">

                    <small>
                        Total Tests
                    </small>

                    <strong>

                        ${report.totalTests ?? '-'}

                    </strong>

                    </div>

                    <p>   
                        <strong>Observações: lorem ipsum dolor sit amet</strong>
                    </p>

                </header>


                <h3>
                    Overall Execution Status
                </h3>


                <div class="statuses">

                    ${statusesHtml}

                </div>


                <h3>
                    Defect Status
                </h3>


                ${linksHtml}


                </section>

            `;

            }
        )
        .join('');


    return `

    <!DOCTYPE html>

    <html>

    <head>

    <meta charset="UTF-8">

    <title>
    Jira / Xray Report
    </title>

    <style>

    * {
    box-sizing: border-box;
    }

    body {

    margin: 0;
    padding: 30px;

    background:
        #f4f5f7;

    color:
        #172b4d;

    font-family:
        Arial,
        sans-serif;
    }

    .page {

    max-width:
        1200px;

    margin:
        auto;
    }

    h1,
    h2,
    h3 {

    font-weight:
        bold;
    }

    .report {

    background:
        white;

    border:
        1px solid
        #dfe1e6;

    border-radius:
        10px;

    padding:
        28px;

    margin-bottom:
        30px;

    box-shadow:
        0 2px 8px
        rgba(0,0,0,.06);
    }

    header {

    display:
        flex;

    align-items:
        flex-start;

    justify-content:
        space-between;

    gap:
        30px;

    padding-bottom:
        20px;

    border-bottom:
        1px solid
        #ebecf0;
    }

    .prit-header {

    font-weight:
        bold;

    margin-bottom:
        5px;
    }

    a {

    color:
        #0052cc;

    text-decoration:
        none;
    }

    a:hover {

    text-decoration:
        underline;
    }

    .total {

    background:
        #f4f5f7;

    padding:
        12px 20px;

    border-radius:
        8px;

    text-align:
        center;

    min-width:
        120px;
    }

    .total small {

    display:
        block;

    color:
        #5e6c84;

    margin-bottom:
        5px;
    }

    .total strong {

    display:
        block;

    font-size:
        26px;
    }

    .statuses {

    display:
        flex;

    gap:
        12px;

    flex-wrap:
        wrap;
    }

    .status-card {

    min-width:
        140px;

    padding:
        15px 20px;

    border-radius:
        8px;

    border:
        1px solid;
    }

    .status-number {

    font-size:
        34px;

    font-weight:
        bold;
    }

    .status-name {

    font-size:
        12px;

    font-weight:
        bold;
    }

    .status-pass {

    background:
        #e8f5d6;

    color:
        #4f7f1f;

    border-color:
        #95c160;
    }

    .status-fail {

    background:
        #fde8e7;

    color:
        #c0392b;

    border-color:
        #d85b53;
    }

    .status-blocked {

    background:
        #ffe5fa;

    color:
        #cc009f;

    border-color:
        #ff00cc;
    }

    .status-other {

    background:
        #e9f2ff;

    color:
        #0747a6;

    border-color:
        #6b9ee8;
    }

    .relation {

    margin-top:
        22px;
    }

    table {

    width:
        100%;

    margin-top:
        8px;

    border-collapse:
        collapse;
    }

    th {

    background:
        #f4f5f7;

    text-align:
        left;

    font-weight:
        bold;

    padding:
        10px;
    }

    td {

    padding:
        10px;

    border-bottom:
        1px solid
        #ebecf0;
    }

    .prit {

    width:
        120px;

    font-weight:
        bold;
    }

    .issue-status {

    background:
        #deebff;

    color:
        #0747a6;

    font-size:
        11px;

    font-weight:
        bold;

    padding:
        4px 8px;

    border-radius:
        4px;
    }

    </style>

    </head>

    <body>

    <div class="page">

    <h1>
        Jira / Xray Execution Report
    </h1>

    ${reportsHtml}

    </div>

    </body>

    </html>

    `;
    }