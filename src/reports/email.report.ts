    import fs from 'node:fs';
    import path from 'node:path';

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
    getStatusColors
    } from '../utils/html.utils';


    /* =========================================================
    UM REPORT
    ========================================================= */

    function createReportBlock(
    report: Report
    ): string {

    /* =====================================================
        STATUS
        ===================================================== */

    const statuses =
        report.executionStatuses
        .map(
            item => {

            const colors =
                getStatusColors(
                item.status
                );


            return `

                <td
                style="
                    background:${colors.background};
                    color:${colors.color};
                    border:1px solid ${colors.border};
                    padding:11px 16px;
                    text-align:center;
                    font-family:Arial,sans-serif;
                    min-width:90px;
                "
                >

                <div
                    style="
                    font-size:26px;
                    font-weight:bold;
                    "
                >
                    ${item.quantidade}
                </div>


                <div
                    style="
                    font-size:10px;
                    font-weight:bold;
                    "
                >
                    ${escapeHtml(item.status)}
                </div>


                </td>

            `;

            }
        )
        .join(

            '<td style="width:8px;"></td>'

        );


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

                        <tr>


                        <!-- DEFECT ICON -->

                        <td
                            width="22"
                            style="
                            padding:5px 3px;
                            border-bottom:1px solid #dfe1e6;
                            vertical-align:middle;
                            "
                        >

                            <span
                            style="
                                display:inline-block;
                                background:#ff5630;
                                color:#ffffff;
                                width:13px;
                                height:13px;
                                line-height:13px;
                                text-align:center;
                                font-size:7px;
                                font-weight:bold;
                            "
                            >
                            &lt;&gt;
                            </span>

                        </td>


                        <!-- KEY -->

                        <td
                            width="95"
                            style="
                            padding:5px 5px;
                            border-bottom:1px solid #dfe1e6;
                            vertical-align:middle;
                            white-space:nowrap;
                            "
                        >

                            <a
                            href="${JIRA_URL}/browse/${encodeURIComponent(issue.prit)}"
                            style="
                                color:#0052cc;
                                font-size:11px;
                                text-decoration:none;
                            "
                            >

                            ${escapeHtml(issue.prit)}

                            </a>

                        </td>


                        <!-- TITLE -->

                        <td
                            style="
                            padding:5px 5px;
                            border-bottom:1px solid #dfe1e6;
                            font-size:11px;
                            color:#172b4d;
                            vertical-align:middle;
                            "
                        >

                            ${escapeHtml(issue.titulo)}

                        </td>


                        <!-- PRIORITY -->

                        <td
                            width="35"
                            align="center"
                            title="${escapeHtml(priority.label)}"
                            style="
                            padding:5px;
                            border-bottom:1px solid #dfe1e6;
                            vertical-align:middle;
                            color:${priority.color};
                            font-size:18px;
                            font-weight:bold;
                            "
                        >

                            ${priority.symbol}

                        </td>


                        <!-- STATUS -->

                        <td
                            width="110"
                            style="
                            padding:5px;
                            border-bottom:1px solid #dfe1e6;
                            vertical-align:middle;
                            white-space:nowrap;
                            "
                        >

                            <span
                            style="
                                display:inline-block;
                                background:${issueStatus.background};
                                color:${issueStatus.color};
                                padding:2px 6px;
                                font-size:9px;
                                font-weight:bold;
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

                <div
                style="
                    margin-top:14px;
                    font-family:Arial,sans-serif;
                "
                >


                <div
                    style="
                    font-size:12px;
                    font-weight:bold;
                    color:#172b4d;
                    margin-bottom:4px;
                    "
                >

                    ${escapeHtml(relation)}

                </div>


                <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                    width:100%;
                    border-collapse:collapse;
                    font-family:Arial,sans-serif;
                    "
                >

                    ${rows}

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

        <div
        style="
            border:1px solid #dfe1e6;
            padding:18px;
            margin-bottom:18px;
            background:#ffffff;
            font-family:Arial,sans-serif;
        "
        >


        <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
        >


            <tr>


            <td>


                <div
                style="
                    font-size:12px;
                    font-weight:bold;
                "
                >

                <a
                    href="${JIRA_URL}/browse/${encodeURIComponent(report.prit)}"
                    style="
                    color:#0052cc;
                    text-decoration:none;
                    "
                >

                    ${escapeHtml(report.prit)}

                </a>

                </div>


                <div
                style="
                    font-size:18px;
                    font-weight:bold;
                    color:#172b4d;
                    margin-top:4px;
                "
                >

                ${escapeHtml(report.title)}

                </div>


            </td>


            <td
                width="130"
                align="right"
                style="
                font-size:11px;
                vertical-align:top;
                "
            >

                <strong>

                Total Tests:
                ${report.totalTests ?? '-'}

                </strong>

            </td>


            </tr>


        </table>


        <div
            style="
            font-size:12px;
            font-weight:bold;
            margin-top:18px;
            margin-bottom:8px;
            "
        >

            Overall Execution Status

        </div>


        <table
            cellpadding="0"
            cellspacing="0"
        >

            <tr>

            ${statuses}

            </tr>

        </table>


        <div
            style="
            font-size:12px;
            font-weight:bold;
            margin-top:20px;
            margin-bottom:5px;
            "
        >

            Defect Status

        </div>


        ${
            issueLinks ||

            `
            <div
                style="
                color:#6b778c;
                font-size:11px;
                margin-top:8px;
                "
            >

                Nenhum Issue Link encontrado.

            </div>
            `
        }


        </div>

    `;

    }


    /* =========================================================
    EMAIL COMPLETO
    ========================================================= */

    export function createEmailReport(
    positions: PositionReport[]
    ): string {

    const reportsHtml =
        positions
        .map(
            position => {

            const positionReports =
                position.reports
                .map(
                    report =>
                    createReportBlock(
                        report
                    )
                )
                .join('');


            return `

                <div
                style="
                    border:2px solid #9adf6d;
                    margin-bottom:28px;
                    font-family:Arial,sans-serif;
                "
                >


                <div
                    style="
                    background:#c9f7a8;
                    color:#163300;
                    font-size:23px;
                    font-weight:bold;
                    padding:14px 18px;
                    border-bottom:2px solid #9adf6d;
                    "
                >

                    ${escapeHtml(
                    position.position
                    )}

                </div>


                <div
                    style="
                    padding:17px;
                    background:#ffffff;
                    "
                >

                    ${positionReports}

                </div>


                </div>

            `;

            }
        )
        .join('');


    /* =====================================================
        TEMPLATE
        ===================================================== */

    const templatePath =
        path.join(

        process.cwd(),

        'src',

        'templates',

        'email-body.html'

        );


    if (
        !fs.existsSync(
        templatePath
        )
    ) {

        throw new Error(
        `Template não encontrado: ${templatePath}`
        );

    }


    const template =
        fs.readFileSync(
        templatePath,
        'utf-8'
        );


    if (
        !template.includes(
        '<!-- REPORTS -->'
        )
    ) {

        throw new Error(
        'email-body.html não possui <!-- REPORTS -->'
        );

    }


    return template.replace(
        '<!-- REPORTS -->',
        reportsHtml
    );

    }