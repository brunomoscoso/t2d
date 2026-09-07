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
    BLOCO DE UM PRIT
    ========================================================= */

    function createReportBlock(
    report: Report
    ): string {

    /* =====================================================
        STATUS PRINCIPAL
        ===================================================== */

    const mainStatusColors =
        getIssueStatusColors(
        report.mainStatus
        );


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
        ISSUE LINKS
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


    const issueLinks =
        relations
        .map(
            relation => {

            const issues =
                report.issueLinks.filter(
                issue =>
                    issue.relation === relation
                );


            const rows =
                issues
                .map(
                    issue => {

                    const priority =
                        getPriorityMeta(
                        issue.priority
                        );


                    const statusColors =
                        getIssueStatusColors(
                        issue.status
                        );


                    return `

                        <tr class="jira-issue-row">


                        <td class="issue-type-cell">

                            <span
                            class="defect-icon"
                            >
                            &lt;&gt;
                            </span>

                        </td>


                        <td class="issue-key-cell">

                            <a
                            href="${JIRA_URL}/browse/${encodeURIComponent(issue.prit)}"
                            >

                            ${escapeHtml(issue.prit)}

                            </a>

                        </td>


                        <td class="issue-summary-cell">

                            ${escapeHtml(issue.titulo)}

                        </td>


                        <td
                            class="priority-cell"
                            title="${escapeHtml(priority.label)}"
                        >

                            <span
                            style="
                                color:${priority.color};
                            "
                            >

                            ${priority.symbol}

                            </span>

                        </td>


                        <td class="issue-state-cell">

                            <span
                            class="issue-status"
                            style="
                                background:${statusColors.background};
                                color:${statusColors.color};
                                border:1px solid ${statusColors.border};
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


                <table class="jira-issues-table">

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
        BLOCO
        ===================================================== */

    return `

        <div class="operation-card">


        <!-- STATUS PRINCIPAL DA TAREFA -->


        <div class="task-status-line">


            <span class="task-name">

            ${escapeHtml(report.title)}:

            </span>


            <span
            class="main-status-badge"
            style="
                background:${mainStatusColors.background};
                color:${mainStatusColors.color};
                border:1px solid ${mainStatusColors.border};
            "
            >

            ${escapeHtml(report.mainStatus)}

            </span>


        </div>


        <!-- CABEÇALHO -->


        <div class="operation-header">


            <div class="operation-left">


            <div class="prit-header">

                <a
                href="${JIRA_URL}/browse/${encodeURIComponent(report.prit)}"
                >

                ${escapeHtml(report.prit)}

                </a>

            </div>


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


        <!-- EXECUTION STATUS -->


        <h4>

            Overall Execution Status

        </h4>


        <div class="statuses">

            ${statuses}

        </div>


        <!-- DEFECTS -->


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
    HTML
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

                    ${escapeHtml(position.position)}

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


    /* POSITION */

    .position-block {

    background:#ffffff;

    border:
        2px solid #dfe1e6;

    border-radius:10px;

    margin-bottom:32px;

    overflow:hidden;

    }


    .position-title {

    background:#c9f7a8;

    color:#163300;

    font-size:25px;

    font-weight:bold;

    padding:15px 20px;

    border-bottom:
        2px solid #9adf6d;

    }


    .position-content {

    padding:20px;

    }


    /* TASK */

    .operation-card {

    border:
        1px solid #dfe1e6;

    border-radius:8px;

    padding:20px;

    margin-bottom:22px;

    background:#ffffff;

    }


    .task-status-line {

    display:flex;

    align-items:center;

    gap:9px;

    margin-bottom:14px;

    }


    .task-name {

    font-size:16px;

    font-weight:bold;

    text-decoration:underline;

    }


    .main-status-badge {

    display:inline-block;

    padding:3px 9px;

    font-size:10px;

    font-weight:bold;

    text-transform:uppercase;

    border-radius:3px;

    }


    /* HEADER */

    .operation-header {

    display:flex;

    justify-content:
        space-between;

    align-items:
        flex-start;

    gap:20px;

    }


    .operation-left {

    flex:1;

    }


    .prit-header {

    font-size:12px;

    font-weight:bold;

    }


    a {

    color:#0052cc;

    text-decoration:none;

    }


    .total {

    min-width:110px;

    background:#f4f5f7;

    padding:8px 14px;

    text-align:center;

    }


    .total small {

    display:block;

    font-size:10px;

    color:#5e6c84;

    }


    .total strong {

    display:block;

    font-size:21px;

    }


    /* TITLES */

    h4 {

    margin-top:20px;

    margin-bottom:8px;

    font-size:12px;

    }


    /* EXECUTION STATUS */

    .statuses {

    display:flex;

    gap:9px;

    flex-wrap:wrap;

    }


    .status-card {

    min-width:95px;

    text-align:center;

    padding:10px 14px;

    border:1px solid;

    }


    .status-number {

    font-size:26px;

    font-weight:bold;

    }


    .status-name {

    font-size:9px;

    font-weight:bold;

    }


    .status-pass {
    background:#e8f5d6;
    color:#4f7f1f;
    border-color:#95c160;
    }


    .status-fail {
    background:#fde8e7;
    color:#c0392b;
    border-color:#d85b53;
    }


    .status-executing {
    background:#fff4cc;
    color:#806600;
    border-color:#e5c84a;
    }


    .status-todo {
    background:#eeeeee;
    color:#555555;
    border-color:#aaaaaa;
    }


    .status-aborted {
    background:#222222;
    color:#ffffff;
    border-color:#000000;
    }


    .status-for-testing {
    background:#efe4ff;
    color:#6f42c1;
    border-color:#a77be8;
    }


    .status-pending-3rd {
    background:#e9f2ff;
    color:#0747a6;
    border-color:#6b9ee8;
    }


    .status-blocked {
    background:#ffe5fa;
    color:#cc009f;
    border-color:#ff00cc;
    }


    .status-other {
    background:#f4f5f7;
    color:#5e6c84;
    border-color:#c1c7d0;
    }


    /* DEFECTS */

    .relation {

    margin-top:13px;

    }


    .relation-title {

    font-size:12px;

    font-weight:bold;

    margin-bottom:4px;

    }


    .jira-issues-table {

    width:100%;

    border-collapse:collapse;

    }


    .jira-issue-row {

    border-bottom:
        1px solid #dfe1e6;

    }


    .jira-issues-table td {

    padding:5px;

    font-size:11px;

    }


    .issue-type-cell {

    width:22px;

    }


    .defect-icon {

    display:inline-block;

    width:13px;

    height:13px;

    line-height:13px;

    text-align:center;

    background:#ff5630;

    color:white;

    font-size:7px;

    font-weight:bold;

    }


    .issue-key-cell {

    width:95px;

    }


    .issue-summary-cell {

    color:#172b4d;

    }


    .priority-cell {

    width:35px;

    text-align:center;

    font-size:17px;

    font-weight:bold;

    }


    .issue-state-cell {

    width:115px;

    }


    .issue-status {

    display:inline-block;

    padding:2px 6px;

    font-size:9px;

    font-weight:bold;

    text-transform:uppercase;

    }


    .empty {

    color:#6b778c;

    font-size:11px;

    }


    </style>


    </head>


    <body>


    <div class="page">

    ${positionsHtml}

    </div>


    </body>


    </html>

    `;

    }