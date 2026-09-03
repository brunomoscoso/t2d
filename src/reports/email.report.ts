    import fs from 'node:fs';
    import path from 'node:path';

    import {
    Report
    } from '../types/report.types';

    import {
    JIRA_URL
    } from '../config/jira.config';

    import {
    escapeHtml
    } from '../utils/html.utils';


    /* =========================================================
    CORES DOS STATUS
    ========================================================= */

    function getStatusColors(
    status: string
    ) {

    const normalized =
        status
        .trim()
        .toUpperCase();


    if (normalized === 'PASS') {

        return {
        background: '#e8f5d6',
        color: '#4f7f1f',
        border: '#95c160'
        };

    }


    if (normalized === 'FAIL') {

        return {
        background: '#fde8e7',
        color: '#c0392b',
        border: '#d85b53'
        };

    }


    if (normalized === 'BLOCKED') {

        return {
        background: '#ffe5fa',
        color: '#cc009f',
        border: '#ff00cc'
        };

    }


    return {
        background: '#e9f2ff',
        color: '#0747a6',
        border: '#6b9ee8'
    };

    }


    /* =========================================================
    GERA BLOCO DE UM PRIT
    ========================================================= */

    function createReportBlock(
    report: Report
    ): string {


    /* =======================================================
        EXECUTION STATUS
        ======================================================= */

    const statuses =
        report.executionStatuses
        .map(item => {

            const colors =
            getStatusColors(
                item.status
            );


            return `

            <td
                style="
                background-color:${colors.background};
                color:${colors.color};
                padding:15px 25px;
                border:1px solid ${colors.border};
                text-align:center;
                font-family:Arial,Helvetica,sans-serif;
                "
            >

                <div
                style="
                    font-size:28px;
                    font-weight:bold;
                "
                >
                ${item.quantidade}
                </div>


                <div
                style="
                    font-size:12px;
                    font-weight:bold;
                "
                >
                ${escapeHtml(item.status)}
                </div>

            </td>

            `;

        })
        .join(
            '<td style="width:10px;"></td>'
        );


    /* =======================================================
        RELAÇÕES DOS ISSUE LINKS

        Exemplo:

        created
        is blocked by
        ======================================================= */

    const relations =
        [
        ...new Set(
            report.issueLinks.map(
            issue =>
                issue.relation
            )
        )
        ];


    /* =======================================================
        ISSUE LINKS
        ======================================================= */

    const issueLinks =
        relations
        .map(relation => {


            const issues =
            report.issueLinks.filter(
                issue =>
                issue.relation === relation
            );


            const rows =
            issues
                .map(issue => {

                return `

                    <tr>

                    <td
                        style="
                        padding:8px;
                        border-bottom:1px solid #ddd;
                        width:110px;
                        vertical-align:top;
                        "
                    >

                        <a
                        href="${JIRA_URL}/browse/${encodeURIComponent(issue.prit)}"
                        style="
                            color:#0052cc;
                            font-weight:bold;
                            text-decoration:none;
                        "
                        >
                        ${escapeHtml(issue.prit)}
                        </a>

                    </td>


                    <td
                        style="
                        padding:8px;
                        border-bottom:1px solid #ddd;
                        vertical-align:top;
                        "
                    >
                        ${escapeHtml(issue.titulo)}
                    </td>


                    <td
                        style="
                        padding:8px;
                        border-bottom:1px solid #ddd;
                        width:130px;
                        vertical-align:top;
                        white-space:nowrap;
                        "
                    >

                        <span
                        style="
                            display:inline-block;
                            background:#deebff;
                            color:#0747a6;
                            padding:4px 8px;
                            font-size:11px;
                            font-weight:bold;
                        "
                        >
                        ${escapeHtml(issue.status)}
                        </span>

                    </td>

                    </tr>

                `;

                })
                .join('');


            return `

            <div
                style="
                margin-top:18px;
                margin-bottom:15px;
                "
            >

                <div
                style="
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:14px;
                    font-weight:bold;
                    margin-bottom:7px;
                    color:#172b4d;
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
                    font-family:Arial,Helvetica,sans-serif;
                    font-size:13px;
                "
                >

                <tbody>
                    ${rows}
                </tbody>

                </table>

            </div>

            `;

        })
        .join('');


    /* =======================================================
        BLOCO COMPLETO DO PRIT
        ======================================================= */

    return `

        <div
        style="
            margin-top:25px;
            margin-bottom:30px;
            padding:22px;
            border:1px solid #dfe1e6;
            background:#ffffff;
            font-family:Arial,Helvetica,sans-serif;
        "
        >


        <!-- CABEÇALHO -->

        <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
            width:100%;
            font-family:Arial,Helvetica,sans-serif;
            "
        >

            <tr>

            <td
                style="
                vertical-align:top;
                "
            >

                <div
                style="
                    font-size:14px;
                    font-weight:bold;
                    margin-bottom:6px;
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
                    font-size:20px;
                    font-weight:bold;
                    color:#172b4d;
                    line-height:1.4;
                "
                >
                ${escapeHtml(report.title)}
                </div>

            </td>


            <td
                align="right"
                style="
                width:130px;
                vertical-align:top;
                "
            >

                <div
                style="
                    background:#f4f5f7;
                    padding:10px 16px;
                    text-align:center;
                "
                >

                <div
                    style="
                    color:#5e6c84;
                    font-size:11px;
                    margin-bottom:4px;
                    "
                >
                    Total Tests
                </div>


                <div
                    style="
                    font-size:24px;
                    font-weight:bold;
                    color:#172b4d;
                    "
                >
                    ${report.totalTests ?? '-'}
                </div>

                </div>

            </td>

            </tr>

        </table>


        <!-- OVERALL STATUS -->

        <div
            style="
            font-size:15px;
            font-weight:bold;
            color:#172b4d;
            margin-top:25px;
            margin-bottom:10px;
            "
        >
            Overall Execution Status
        </div>


        <table
            cellpadding="0"
            cellspacing="0"
            style="
            margin-bottom:25px;
            "
        >

            <tr>
            ${statuses}
            </tr>

        </table>


        <!-- DEFECT STATUS -->

        <div
            style="
            font-size:15px;
            font-weight:bold;
            color:#172b4d;
            margin-top:25px;
            margin-bottom:10px;
            "
        >
            Defect Status
        </div>


        ${
            report.issueLinks.length > 0

            ? issueLinks

            : `

                <div
                    style="
                    font-size:13px;
                    color:#6b778c;
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
    GERA O EMAIL COMPLETO
    ========================================================= */

    export function createEmailReport(
    reports: Report[]
    ): string {


    /* =======================================================
        GERA TODOS OS PRITS
        ======================================================= */

    const reportsHtml =
        reports
        .map(
            report =>
            createReportBlock(
                report
            )
        )
        .join('');


    /* =======================================================
        LOCALIZA O TEMPLATE
        ======================================================= */

    const templatePath =
        path.join(
        process.cwd(),
        'src',
        'templates',
        'email-body.html'
        );


    /* =======================================================
        VERIFICA SE O TEMPLATE EXISTE
        ======================================================= */

    if (
        !fs.existsSync(
        templatePath
        )
    ) {

        throw new Error(
        `Template não encontrado: ${templatePath}`
        );

    }


    /* =======================================================
        LÊ O TEMPLATE
        ======================================================= */

    const template =
        fs.readFileSync(
        templatePath,
        'utf-8'
        );


    /* =======================================================
        VERIFICA SE EXISTE O MARCADOR
        ======================================================= */

    if (
        !template.includes(
        '<!-- REPORTS -->'
        )
    ) {

        throw new Error(
        'O template email-body.html não possui <!-- REPORTS -->'
        );

    }


    /* =======================================================
        INSERE OS REPORTS NO TEMPLATE
        ======================================================= */

    return template.replace(
        '<!-- REPORTS -->',
        reportsHtml
    );

    }