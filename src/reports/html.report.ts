    import {
    JIRA_URL
    } from '../config/jira.config';

    import {
    PositionReport,
    Report
    } from '../types/report.types';

    import {
    escapeHtml,
    getIssueStatusColors,
    getPriorityMeta,
    getStatusClass
    } from '../utils/html.utils';


    /* =========================================================
    REPORT / PRIT
    ========================================================= */

    function createReportBlock(
    report: Report
    ): string {

    /* =====================================================
        EXECUTION STATUS
        ===================================================== */

    const statuses =
        report.executionStatuses
        .map(
            item => `

            <div
                class="
                status-card
                ${getStatusClass(item.status)}
                "
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


    /* =====================================================
        RELAÇÕES
        ===================================================== */

    const relations =
        [
        ...new Set(
            report.issueLinks.map(
            issue =>
                issue.relation
            )
        )
        ];


    /* =====================================================
        ISSUE LINKS
        ===================================================== */

    const issueLinks =
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
                    issue => {

                    const priority =
                        getPriorityMeta(
                        issue.priority
                        );


                    const issueStatus =
                        getIssueStatusColors(
                        issue.status
                        );


                    return `

                        <tr class="jira-issue-row">


                        <!-- ISSUE TYPE -->

                        <td class="issue-type-cell">

                            <span
                            class="defect-icon"
                            title="Defect"
                            >
                            &lt;&gt;
                            </span>

                        </td>


                        <!-- PRIT -->

                        <td class="issue-key-cell">

                            <a
                            href="${JIRA_URL}/browse/${encodeURIComponent(issue.prit)}"
                            >

                            ${escapeHtml(issue.prit)}

                            </a>

                        </td>


                        <!-- SUMMARY -->

                        <td class="issue-summary-cell">

                            ${escapeHtml(issue.titulo)}

                        </td>


                        <!-- PRIORIDADE -->

                        <td
                            class="priority-cell"
                            title="${escapeHtml(priority.label)}"
                        >

                            <span
                            class="priority-icon"
                            style="
                                color:${priority.color};
                            "
                            >
                            ${priority.symbol}
                            </span>

                        </td>


                        <!-- STATUS -->

                        <td class="issue-state-cell">

                            <span
                            class="issue-status"
                            style="
                                background:${issueStatus.background};
                                color:${issueStatus.color};
                            "
                            >

                            ${escapeHtml(issue.status)}

                            </span>

                        </td>


                        </tr>

                    `;

                    }
                )
                .join('');


            return `

                <div class="relation">


                <div class="relation-title">

                    ${escapeHtml(relation)}

                </div>


                <table
                    class="jira-issues-table"
                >

                    <tbody>

                    ${rows}

                    </tbody>

                </table>


                </div>

            `;

            }
        )
        .join('');


    /* =====================================================
        OPERAÇÃO
        ===================================================== */

    return `

        <div class="operation-card">


        <div class="operation-header">


            <div class="operation-left">


            <div class="prit-header">

                <a
                href="${JIRA_URL}/browse/${encodeURIComponent(report.prit)}"
                >

                ${escapeHtml(report.prit)}

                </a>

            </div>


            <h3>

                ${escapeHtml(report.title)}

            </h3>


            </div>


            <div class="total">


            <small>

                Total Tests

            </small>


            <strong>

                ${report.totalTests ?? '-'}

            </strong>


            </div>


        </div>


        <h4>

            Overall Execution Status

        </h4>


        <div class="statuses">

            ${statuses}

        </div>


        <h4>

            Defect Status

        </h4>


        ${
            issueLinks ||

            `
            <div class="empty">

                Nenhum Issue Link encontrado.

            </div>
            `
        }


        </div>

    `;

    }


    /* =========================================================
    HTML COMPLETO
    ========================================================= */

    export function createHtmlReport(
    positions: PositionReport[]
    ): string {

    const positionsHtml =
        positions
        .map(
            position => {

            const reportsHtml =
                position.reports
                .map(
                    report =>
                    createReportBlock(
                        report
                    )
                )
                .join('');


            return `

                <section class="position-block">


                <div class="position-title">

                    ${escapeHtml(
                    position.position
                    )}

                </div>


                <div class="position-content">

                    ${reportsHtml}

                </div>


                </section>

            `;

            }
        )
        .join('');


    return `

    <!DOCTYPE html>

    <html lang="pt">

    <head>


    <meta charset="UTF-8">


    <title>
    Jira / Xray Report
    </title>


    <style>


    * {
    box-sizing:border-box;
    }


    body {

    margin:0;

    padding:24px;

    background:#f4f5f7;

    color:#172b4d;

    font-family:
        Arial,
        Helvetica,
        sans-serif;

    }


    .page {

    max-width:1350px;

    margin:auto;

    }


    .page-title {

    font-size:28px;

    font-weight:bold;

    margin-bottom:25px;

    }


    /* =========================================================
    POSIÇÃO
    ========================================================= */

    .position-block {

    background:#ffffff;

    border:
        2px solid
        #dfe1e6;

    border-radius:10px;

    margin-bottom:32px;

    overflow:hidden;

    box-shadow:
        0 2px 10px
        rgba(0,0,0,.06);

    }


    .position-title {

    background:#c9f7a8;

    color:#163300;

    font-size:25px;

    font-weight:bold;

    padding:15px 20px;

    border-bottom:
        2px solid
        #9adf6d;

    }


    .position-content {

    padding:20px;

    }


    /* =========================================================
    OPERAÇÕES
    ========================================================= */

    .operation-card {

    border:
        1px solid
        #dfe1e6;

    border-radius:8px;

    padding:20px;

    margin-bottom:22px;

    background:#ffffff;

    }


    .operation-card:last-child {

    margin-bottom:0;

    }


    .operation-header {

    display:flex;

    justify-content:
        space-between;

    gap:24px;

    align-items:
        flex-start;

    }


    .operation-left {

    flex:1;

    }


    .prit-header {

    font-size:12px;

    font-weight:bold;

    margin-bottom:4px;

    }


    a {

    color:#0052cc;

    text-decoration:none;

    }


    a:hover {

    text-decoration:underline;

    }


    h3 {

    margin:0;

    font-size:18px;

    font-weight:bold;

    }


    h4 {

    margin-top:21px;

    margin-bottom:9px;

    font-size:13px;

    font-weight:bold;

    }


    .total {

    min-width:120px;

    background:#f4f5f7;

    padding:9px 15px;

    text-align:center;

    }


    .total small {

    display:block;

    font-size:11px;

    color:#5e6c84;

    }


    .total strong {

    display:block;

    font-size:22px;

    }


    /* =========================================================
    EXECUTION STATUS
    ========================================================= */

    .statuses {

    display:flex;

    flex-wrap:wrap;

    gap:9px;

    }


    .status-card {

    min-width:100px;

    padding:11px 16px;

    border:
        1px solid;

    text-align:center;

    }


    .status-number {

    font-size:27px;

    font-weight:bold;

    }


    .status-name {

    font-size:10px;

    font-weight:bold;

    }


    /* PASS */

    .status-pass {

    background:#e8f5d6;

    color:#4f7f1f;

    border-color:#95c160;

    }


    /* FAIL */

    .status-fail {

    background:#fde8e7;

    color:#c0392b;

    border-color:#d85b53;

    }


    /* EXECUTING */

    .status-executing {

    background:#fff4cc;

    color:#806600;

    border-color:#e5c84a;

    }


    /* TO DO */

    .status-todo {

    background:#eeeeee;

    color:#555555;

    border-color:#aaaaaa;

    }


    /* ABORTED */

    .status-aborted {

    background:#222222;

    color:#ffffff;

    border-color:#000000;

    }


    /* FOR TESTING */

    .status-for-testing {

    background:#efe4ff;

    color:#6f42c1;

    border-color:#a77be8;

    }


    /* PENDING 3RD */

    .status-pending-3rd {

    background:#e9f2ff;

    color:#0747a6;

    border-color:#6b9ee8;

    }


    /* BLOCKED */

    .status-blocked {

    background:#ffe5fa;

    color:#cc009f;

    border-color:#ff00cc;

    }


    /* OUTROS */

    .status-other {

    background:#f4f5f7;

    color:#5e6c84;

    border-color:#c1c7d0;

    }


    /* =========================================================
    ISSUE LINKS - JIRA STYLE
    ========================================================= */

    .relation {

    margin-top:13px;

    }


    .relation-title {

    font-size:12px;

    font-weight:bold;

    margin-bottom:4px;

    color:#172b4d;

    }


    .jira-issues-table {

    width:100%;

    border-collapse:collapse;

    table-layout:auto;

    }


    .jira-issue-row {

    border-bottom:
        1px solid #dfe1e6;

    }


    .jira-issue-row:hover {

    background:#f4f5f7;

    }


    .jira-issues-table td {

    padding:
        5px 6px;

    vertical-align:
        middle;

    font-size:
        11px;

    }


    /* TYPE ICON */

    .issue-type-cell {

    width:22px;

    padding-right:2px !important;

    }


    .defect-icon {

    display:inline-block;

    width:13px;

    height:13px;

    line-height:13px;

    text-align:center;

    background:#ff5630;

    color:#ffffff;

    font-size:7px;

    font-weight:bold;

    border-radius:2px;

    }


    /* PRIT */

    .issue-key-cell {

    width:95px;

    white-space:nowrap;

    }


    .issue-key-cell a {

    color:#0052cc;

    font-size:11px;

    }


    /* SUMMARY */

    .issue-summary-cell {

    color:#172b4d;

    line-height:1.25;

    }


    /* PRIORITY */

    .priority-cell {

    width:35px;

    text-align:center;

    }


    .priority-icon {

    font-size:18px;

    font-weight:bold;

    line-height:1;

    }


    /* STATUS */

    .issue-state-cell {

    width:110px;

    text-align:left;

    white-space:nowrap;

    }


    .issue-status {

    display:inline-block;

    padding:
        2px 6px;

    font-size:9px;

    font-weight:bold;

    line-height:1.2;

    text-transform:uppercase;

    }


    /* EMPTY */

    .empty {

    color:#6b778c;

    font-size:12px;

    }


    </style>


    </head>


    <body>


    <div class="page">


    <div class="page-title">

        Jira / Xray Execution Report

    </div>


    ${positionsHtml}


    </div>


    </body>

    </html>

    `;

    }