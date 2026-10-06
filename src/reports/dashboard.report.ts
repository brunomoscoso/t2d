    import {
    JIRA_URL
    } from '../config/jira.config';

    import {
    DashboardData
    } from '../types/report.types';

    import {
    escapeHtml,
    getIssueStatusColors,
    getPriorityMeta
    } from '../utils/html.utils';


    /* =========================================================
    LINHAS
    ========================================================= */

    function createDashboardRows(
    dashboard: DashboardData
    ): string {

    return dashboard.defects
        .map(
        defect => {

            const priority =
            getPriorityMeta(
                defect.priority
            );


            const status =
            getIssueStatusColors(
                defect.status
            );


            return `

            <tr>


                <!-- ISSUE TYPE -->


                <td
                style="
                    width:28px;
                    padding:6px;
                    border-bottom:1px solid #dfe1e6;
                    text-align:center;
                    vertical-align:middle;
                "
                >

                <span
                    title="${escapeHtml(defect.issueType)}"
                    style="
                    display:inline-block;
                    width:14px;
                    height:14px;
                    line-height:14px;
                    background:#ff5630;
                    color:#ffffff;
                    font-size:7px;
                    font-weight:bold;
                    text-align:center;
                    border-radius:2px;
                    "
                >

                    &lt;&gt;

                </span>

                </td>


                <!-- PRIORITY -->


                <td
                title="${escapeHtml(priority.label)}"
                style="
                    width:35px;
                    padding:6px;
                    border-bottom:1px solid #dfe1e6;
                    text-align:center;
                    vertical-align:middle;
                    color:${priority.color};
                    font-size:17px;
                    font-weight:bold;
                "
                >

                ${priority.symbol}

                </td>


                <!-- KEY -->


                <td
                style="
                    width:90px;
                    padding:6px;
                    border-bottom:1px solid #dfe1e6;
                    vertical-align:middle;
                    white-space:nowrap;
                "
                >

                <a
                    href="${JIRA_URL}/browse/${encodeURIComponent(defect.key)}"
                    style="
                    color:#0052cc;
                    text-decoration:none;
                    font-size:13px;
                    "
                >

                    ${escapeHtml(defect.key)}

                </a>

                </td>


                <!-- SUMMARY -->


                <td
                style="
                    padding:6px;
                    border-bottom:1px solid #dfe1e6;
                    vertical-align:middle;
                    color:#172b4d;
                    font-size:13px;
                "
                >

                ${escapeHtml(defect.summary)}

                </td>


                <!-- STATUS -->


                <td
                style="
                    width:120px;
                    padding:6px;
                    border-bottom:1px solid #dfe1e6;
                    vertical-align:middle;
                    white-space:nowrap;
                "
                >

                <span
                    style="
                    display:inline-block;
                    background:${status.background};
                    color:${status.color};
                    border:1px solid ${status.border};
                    padding:2px 6px;
                    font-size:11px;
                    font-weight:bold;
                    text-transform:uppercase;
                    border-radius:3px;
                    "
                >

                    ${escapeHtml(defect.status)}

                </span>

                </td>


                <!-- ASSIGNEE -->


                <td
                style="
                    width:150px;
                    padding:6px;
                    border-bottom:1px solid #dfe1e6;
                    vertical-align:middle;
                    font-size:12px;
                "
                >

                ${escapeHtml(defect.assignee)}

                </td>


                <!-- CREATED -->


                <td
                style="
                    width:90px;
                    padding:6px;
                    border-bottom:1px solid #dfe1e6;
                    vertical-align:middle;
                    white-space:nowrap;
                    font-size:12px;
                "
                >

                ${escapeHtml(defect.created)}

                </td>


            </tr>

            `;

        }
        )
        .join('');
    }


    /* =========================================================
    BLOCO
    ========================================================= */

    function createDashboardBlock(
    dashboard: DashboardData
    ): string {

    return `

        <div class="dashboard-block"
        style="
            margin-top:32px;
            margin-bottom:24px;
            border:2px solid #dfe1e6;
            background:#ffffff;
            font-family:Arial,Helvetica,sans-serif;
            overflow:hidden;
        "
        >


        <!-- HEADER -->


        <div class="dashboard-header"
            style="
            background:#de350b;
            color:#ffffff;
            padding:10px 14px;
            font-size:16px;
            font-weight:bold;
            "
        >

            ${escapeHtml(dashboard.title)}


            <span
            style="
                float:right;
                font-size:13px;
                font-weight:normal;
            "
            >

            Total:
            ${dashboard.total}

            </span>

        </div>


        <!-- TABLE -->


        <div class="report-table-scroll" data-report-scroll tabindex="0" role="region" aria-label="Defeitos do dashboard">
        <table class="dashboard-table"
            width="100%"
            cellpadding="0"
            cellspacing="0"
            style="
            width:100%;
            border-collapse:collapse;
            table-layout:auto;
            "
        >


            <thead>

            <tr
                style="
                background:#f4f5f7;
                color:#42526e;
                font-size:12px;
                text-align:left;
                "
            >

                <th
                style="
                    width:28px;
                    padding:7px;
                "
                >
                T
                </th>


                <th
                style="
                    width:35px;
                    padding:7px;
                "
                >
                P
                </th>


                <th
                style="
                    width:90px;
                    padding:7px;
                "
                >
                Key
                </th>


                <th
                style="
                    padding:7px;
                "
                >
                Summary
                </th>


                <th
                style="
                    width:120px;
                    padding:7px;
                "
                >
                Status
                </th>


                <th
                style="
                    width:150px;
                    padding:7px;
                "
                >
                Assignee
                </th>


                <th
                style="
                    width:90px;
                    padding:7px;
                "
                >
                Created
                </th>

            </tr>

            </thead>


            <tbody>

            ${createDashboardRows(
                dashboard
            )}

            </tbody>


        </table>

        </div>


        </div>

    `;
    }


    /* =========================================================
    REPORT.HTML
    ========================================================= */

    export function createDashboardHtml(
    dashboard: DashboardData
    ): string {

    return createDashboardBlock(
        dashboard
    );
    }


    /* =========================================================
    EMAIL.HTML
    ========================================================= */

    export function createDashboardEmailHtml(
    dashboard: DashboardData
    ): string {

    return createDashboardBlock(
        dashboard
    );
    }
