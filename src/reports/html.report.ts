    import {
    JIRA_URL
    } from '../config/jira.config';

    import {
    PositionReport,
    Report
    } from '../types/report.types';

    import {
    escapeHtml,
    getStatusClass
    } from '../utils/html.utils';


    function createReportBlock(
    report: Report
    ): string {

    const statuses =
        report.executionStatuses
        .map(
            item => `
            <div class="status-card ${getStatusClass(item.status)}">
                <div class="status-number">${item.quantidade}</div>
                <div class="status-name">${escapeHtml(item.status)}</div>
            </div>
            `
        )
        .join('');


    const relations =
        [...new Set(
        report.issueLinks.map(
            issue => issue.relation
        )
        )];


    const issueLinks =
        relations
        .map(relation => {

            const issues =
            report.issueLinks.filter(
                issue => issue.relation === relation
            );

            const rows =
            issues
                .map(
                issue => `
                    <tr>
                    <td class="prit">
                        <a href="${JIRA_URL}/browse/${encodeURIComponent(issue.prit)}">
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
                <strong>${escapeHtml(relation)}</strong>

                <table>
                <tbody>
                    ${rows}
                </tbody>
                </table>
            </div>
            `;
        })
        .join('');


    return `
        <div class="operation-card">

        <div class="operation-header">

            <div class="operation-left">
            <div class="prit-header">
                <a href="${JIRA_URL}/browse/${encodeURIComponent(report.prit)}">
                ${escapeHtml(report.prit)}
                </a>
            </div>

            <h3>${escapeHtml(report.title)}</h3>
            </div>

            <div class="total">
            <small>Total Tests</small>
            <strong>${report.totalTests ?? '-'}</strong>
            </div>

        </div>

        <h4>Overall Execution Status</h4>

        <div class="statuses">
            ${statuses}
        </div>

        <h4>Defect Status</h4>

        ${
            issueLinks ||
            '<div class="empty">Nenhum Issue Link encontrado.</div>'
        }

        </div>
    `;
    }


    export function createHtmlReport(
    positions: PositionReport[]
    ): string {

    const positionsHtml =
        positions
        .map(position => {

            const reportsHtml =
            position.reports
                .map(report => createReportBlock(report))
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
        })
        .join('');


    return `
    <!DOCTYPE html>
    <html lang="pt">
    <head>
    <meta charset="UTF-8">
    <title>Jira / Xray Report</title>

    <style>

    * {
    box-sizing: border-box;
    }

    body {
    margin: 0;
    padding: 24px;
    background: #f4f5f7;
    color: #172b4d;
    font-family: Arial, Helvetica, sans-serif;
    }

    .page {
    max-width: 1300px;
    margin: auto;
    }

    .page-title {
    font-size: 28px;
    font-weight: bold;
    margin-bottom: 24px;
    }

    .position-block {
    background: #ffffff;
    border: 2px solid #dfe1e6;
    border-radius: 12px;
    margin-bottom: 32px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,.06);
    }

    .position-title {
    background: #c9f7a8;
    color: #163300;
    font-size: 26px;
    font-weight: bold;
    padding: 16px 20px;
    border-bottom: 2px solid #9adf6d;
    }

    .position-content {
    padding: 20px;
    }

    .operation-card {
    border: 2px solid #e3e8ee;
    border-radius: 10px;
    padding: 18px;
    margin-bottom: 22px;
    background: #fafbfc;
    }

    .operation-card:last-child {
    margin-bottom: 0;
    }

    .operation-header {
    display: flex;
    justify-content: space-between;
    gap: 24px;
    align-items: flex-start;
    }

    .operation-left {
    flex: 1;
    }

    .prit-header {
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 4px;
    }

    a {
    color: #0052cc;
    text-decoration: none;
    }

    h3 {
    margin: 0;
    font-size: 18px;
    font-weight: bold;
    }

    h4 {
    margin-top: 20px;
    margin-bottom: 10px;
    font-size: 14px;
    font-weight: bold;
    }

    .total {
    min-width: 130px;
    background: #ffffff;
    border: 1px solid #dfe1e6;
    border-radius: 8px;
    padding: 10px 16px;
    text-align: center;
    }

    .total small {
    display: block;
    color: #5e6c84;
    }

    .total strong {
    display: block;
    font-size: 24px;
    }

    .statuses {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    }

    .status-card {
    min-width: 140px;
    padding: 15px 20px;
    border: 1px solid;
    border-radius: 8px;
    }

    .status-number {
    font-size: 32px;
    font-weight: bold;
    }

    .status-name {
    font-size: 12px;
    font-weight: bold;
    }

    .status-pass {
    background: #e8f5d6;
    color: #4f7f1f;
    border-color: #95c160;
    }

    .status-fail {
    background: #fde8e7;
    color: #c0392b;
    border-color: #d85b53;
    }

    .status-blocked {
    background: #ffe5fa;
    color: #cc009f;
    border-color: #ff00cc;
    }

    .status-other {
    background: #e9f2ff;
    color: #0747a6;
    border-color: #6b9ee8;
    }

    .relation {
    margin-top: 18px;
    }

    table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
    }

    td {
    padding: 8px;
    border-bottom: 1px solid #ebecf0;
    }

    .prit {
    width: 120px;
    font-weight: bold;
    }

    .issue-status {
    background: #deebff;
    color: #0747a6;
    padding: 4px 8px;
    font-size: 11px;
    font-weight: bold;
    border-radius: 4px;
    }

    .empty {
    color: #6b778c;
    font-size: 13px;
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