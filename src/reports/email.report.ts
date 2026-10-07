    import fs from 'node:fs';
    import path from 'node:path';
    import { createGlobalStatusTable } from './global-status.report';
    import { createPositionDefectsSection } from './position-defects.report';
    import { createPositionActivitiesTable } from './position-activities.report';
    import { createMainBlockersTable } from './main-blockers.report';
    import { createReleaseLinksSection } from './release-links.report';
    import type { ReleaseLinks } from '../types/report.types';

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
    PRIT
    ========================================================= */

    function createReportBlock(
    report: Report
    ): string {

    /* STATUS PRINCIPAL */

    const mainStatusColors =
        getIssueStatusColors(
        report.mainStatus
        );


    /* EXECUTION STATUS */

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
                    border-radius:8px;
                    padding:10px 15px;
                    text-align:center;
                "
                >

                <div
                    style="
                    font-size:27px;
                    font-weight:bold;
                    "
                >

                    ${item.quantidade}

                </div>


                <div
                    style="
                    font-size:11px;
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


    /* ISSUE LINKS */

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

                        <tr>

                        <td
                            width="22"
                            style="
                            padding:5px 3px;
                            border-bottom:1px solid #dfe1e6;
                            "
                        >

                            <span
                            style="
                                display:inline-block;
                                width:13px;
                                height:13px;
                                line-height:13px;
                                text-align:center;
                                background:#ff5630;
                                color:#ffffff;
                                font-size:7px;
                                font-weight:bold;
                            "
                            >

                            &lt;&gt;

                            </span>

                        </td>


                        <td
                            width="95"
                            style="
                            padding:5px;
                            border-bottom:1px solid #dfe1e6;
                            "
                        >

                            <a
                            href="${JIRA_URL}/browse/${encodeURIComponent(issue.prit)}"
                            style="
                                color:#0052cc;
                                font-size:13px;
                                text-decoration:none;
                            "
                            >

                            ${escapeHtml(issue.prit)}

                            </a>

                        </td>


                        <td
                            style="
                            padding:5px;
                            border-bottom:1px solid #dfe1e6;
                            font-size:13px;
                            "
                        >

                            ${escapeHtml(issue.titulo)}

                        </td>


                        <td
                            width="35"
                            align="center"
                            style="
                            border-bottom:1px solid #dfe1e6;
                            color:${priority.color};
                            font-size:17px;
                            font-weight:bold;
                            "
                        >

                            ${priority.symbol}

                        </td>


                        <td
                            width="115"
                            style="
                            border-bottom:1px solid #dfe1e6;
                            "
                        >

                            <span
                            style="
                                background:${statusColors.background};
                                color:${statusColors.color};
                                border:1px solid ${statusColors.border};
                                padding:2px 6px;
                                font-size:11px;
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
                    margin-top:13px;
                "
                >

                <div
                    style="
                    font-size:14px;
                    font-weight:bold;
                    margin-bottom:4px;
                    "
                >

                    ${escapeHtml(relation)}

                </div>


                <div class="report-table-scroll" data-report-scroll tabindex="0" role="region" aria-label="Defeitos relacionados">
                <table class="jira-issues-table"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    style="
                    border-collapse:collapse;
                    "
                >

                    ${rows}

                </table>

                </div>

                </div>

            `;

            }
        )
        .join('');


    /* =====================================================
        BLOCO
        ===================================================== */

    return `

        <div class="operation-card"
        style="
            border:1px solid #dce5f0;
            border-radius:10px;
            background:#ffffff;
            padding:20px;
            margin-bottom:16px;
            font-family:Arial,sans-serif;
        "
        >


        <!-- STATUS PRINCIPAL -->


        <div
            style="
            margin-bottom:14px;
            "
        >

            <span
            style="
                font-size:17px;
                font-weight:bold;
                line-height:1.5;
            "
            >

            ${escapeHtml(report.title)}:

            </span>


            <span
            style="
                margin-left:8px;
                display:inline-block;
                border-radius:5px;
                background:${mainStatusColors.background};
                color:${mainStatusColors.color};
                border:1px solid ${mainStatusColors.border};
                padding:3px 8px;
                font-size:12px;
                font-weight:bold;
            "
            >

            ${escapeHtml(report.mainStatus)}

            </span>

        </div>


        <!-- PRIT / TOTAL -->


        <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
        >

            <tr>

            <td>

                <a
                href="${JIRA_URL}/browse/${encodeURIComponent(report.prit)}"
                style="
                    color:#0052cc;
                    font-size:14px;
                    font-weight:bold;
                    text-decoration:none;
                "
                >

                ${escapeHtml(report.prit)}

                </a>

            </td>


            <td
                align="right"
                width="120"
            >

                <strong
                style="
                    font-size:13px;
                "
                >

                Total Tests:
                ${report.totalTests ?? '-'}

                </strong>

            </td>

            </tr>

        </table>


        <!-- STATUS -->


        <div
            style="
            margin-top:18px;
            margin-bottom:8px;
            font-size:14px;
            font-weight:bold;
            "
        >

            Overall Execution Status

        </div>


        <div class="report-table-scroll" data-report-scroll tabindex="0" role="region" aria-label="Estados de execução dos testes">
        <table class="execution-summary-table"
            cellpadding="0"
            cellspacing="0"
        >

            <tr>

            ${statuses}

            </tr>

        </table>

        </div>


        <!-- DEFECTS -->


        <div
            style="
            margin-top:20px;
            font-size:14px;
            font-weight:bold;
            "
        >

            Defect Status

        </div>


        ${
            issueLinks ||

            `
            <div
                style="
                margin-top:8px;
                color:#6b778c;
                font-size:13px;
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
    EMAIL
    ========================================================= */

    export function createEmailReport(
    positions: PositionReport[],
    releaseLinks?: ReleaseLinks
    ): string {

    const reportDate = new Intl.DateTimeFormat('pt-PT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Europe/Lisbon',
    }).format(new Date());

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

                <div class="position-block"
                style="
                    border:1px solid #c4dfd4;
                    border-radius:14px;
                    background:#f3f9f6;
                    margin-bottom:32px;
                    font-family:Arial,sans-serif;
                "
                >


                <div
                    style="
                    background:#00875a;
                    border-radius:13px 13px 0 0;
                    color:#ffffff;
                    font-size:23px;
                    font-weight:bold;
                    padding:16px 20px;
                    "
                >

                    ${escapeHtml(
                    position.position
                    )}

                </div>


                <div class="position-content"
                    style="
                    padding:17px;
                    "
                >

                    ${positionReports}

                </div>


                </div>

            `;

            }
        )
        .join('');


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


    return template
        .replace('<!-- REPORT DATE -->', reportDate)
        .replace('<!-- GLOBAL STATUS -->', () => createGlobalStatusTable(positions))
        .replace('<!-- POSITION ACTIVITIES -->', () => createPositionActivitiesTable(positions))
        .replace('<!-- POSITION DEFECTS -->', () => createPositionDefectsSection(positions))
        .replace('<!-- MAIN BLOCKERS -->', () => createMainBlockersTable(positions))
        .replace('<!-- RELEASE LINKS -->', () => createReleaseLinksSection(releaseLinks))
        .replace('<!-- REPORTS -->', () => reportsHtml);

    }
