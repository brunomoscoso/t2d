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
    getStatusColors
    } from '../utils/html.utils';


    function createReportBlock(
    report: Report
    ): string {

    const statuses =
        report.executionStatuses
        .map(item => {

            const colors =
            getStatusColors(item.status);

            return `
            <td
                style="
                background:${colors.background};
                color:${colors.color};
                border:1px solid ${colors.border};
                padding:14px 20px;
                text-align:center;
                border-radius:8px;
                "
            >
                <div style="font-size:28px;font-weight:bold;">
                ${item.quantidade}
                </div>

                <div style="font-size:12px;font-weight:bold;">
                ${escapeHtml(item.status)}
                </div>
            </td>
            `;
        })
        .join('<td style="width:10px;"></td>');


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
                .map(issue => `
                <tr>
                    <td style="padding:8px;border-bottom:1px solid #ddd;width:110px;">
                    <a
                        href="${JIRA_URL}/browse/${encodeURIComponent(issue.prit)}"
                        style="color:#0052cc;font-weight:bold;text-decoration:none;"
                    >
                        ${escapeHtml(issue.prit)}
                    </a>
                    </td>

                    <td style="padding:8px;border-bottom:1px solid #ddd;">
                    ${escapeHtml(issue.titulo)}
                    </td>

                    <td style="padding:8px;border-bottom:1px solid #ddd;width:130px;">
                    <strong>${escapeHtml(issue.status)}</strong>
                    </td>
                </tr>
                `)
                .join('');

            return `
            <div style="margin-top:16px;">
                <div style="font-weight:bold;margin-bottom:6px;">
                ${escapeHtml(relation)}
                </div>

                <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                style="border-collapse:collapse;font-size:13px;"
                >
                ${rows}
                </table>
            </div>
            `;
        })
        .join('');


    return `
        <div
        style="
            border:1px solid #dfe1e6;
            border-radius:8px;
            padding:18px;
            margin-bottom:18px;
            background:#fafbfc;
        "
        >

        <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
            <td>
                <div style="font-size:14px;font-weight:bold;">
                <a
                    href="${JIRA_URL}/browse/${encodeURIComponent(report.prit)}"
                    style="color:#0052cc;text-decoration:none;"
                >
                    ${escapeHtml(report.prit)}
                </a>
                </div>

                <div style="font-size:19px;font-weight:bold;color:#172b4d;margin-top:5px;">
                ${escapeHtml(report.title)}
                </div>
            </td>

            <td align="right" style="width:130px;">
                <strong>Total Tests: ${report.totalTests ?? '-'}</strong>
            </td>
            </tr>
        </table>

        <div style="font-weight:bold;margin-top:18px;margin-bottom:10px;">
            Overall Execution Status
        </div>

        <table cellpadding="0" cellspacing="0">
            <tr>
            ${statuses}
            </tr>
        </table>

        <div style="font-weight:bold;margin-top:22px;margin-bottom:6px;">
            Defect Status
        </div>

        ${
            issueLinks ||
            '<div style="margin-top:10px;color:#6b778c;">Nenhum Issue Link encontrado.</div>'
        }

        </div>
    `;
    }


    export function createEmailReport(
    positions: PositionReport[]
    ): string {

    const reportsHtml =
        positions
        .map(position => {

            const positionReports =
            position.reports
                .map(report => createReportBlock(report))
                .join('');

            return `
            <div
                style="
                border:2px solid #c9e7b4;
                border-radius:10px;
                overflow:hidden;
                margin-bottom:28px;
                font-family:Arial,sans-serif;
                "
            >

                <div
                style="
                    background:#c9f7a8;
                    color:#163300;
                    font-size:24px;
                    font-weight:bold;
                    padding:14px 18px;
                    border-bottom:2px solid #9adf6d;
                "
                >
                ${escapeHtml(position.position)}
                </div>

                <div style="padding:18px;">
                ${positionReports}
                </div>

            </div>
            `;
        })
        .join('');


    const templatePath =
        path.join(
        process.cwd(),
        'src',
        'templates',
        'email-body.html'
        );

    if (!fs.existsSync(templatePath)) {
        throw new Error(
        `Template não encontrado: ${templatePath}`
        );
    }

    const template =
        fs.readFileSync(templatePath, 'utf-8');

    if (!template.includes('<!-- REPORTS -->')) {
        throw new Error(
        'email-body.html não possui <!-- REPORTS -->'
        );
    }

    return template.replace(
        '<!-- REPORTS -->',
        reportsHtml
    );
    }