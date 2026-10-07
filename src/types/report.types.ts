    export type TestPlanLink = {
    prit: string;
    title?: string;
    };

    export type ReleaseLinks = {
    testPlans: Record<'smokes' | 'certification' | 'regression' | 'defectFixing', TestPlanLink>;
    dashboardPageId: string;
    dashboardTitle?: string;
    };

    /* =========================================================
    EXECUTION STATUS
    ========================================================= */

    export type ExecutionStatus = {
    status: string;
    quantidade: number;
    };


    /* =========================================================
    ISSUE LINK
    ========================================================= */

    export type IssueLink = {
    relation: string;
    prit: string;
    titulo: string;
    status: string;
    priority: string;
    };


    /* =========================================================
    REPORT
    ========================================================= */

    export type Report = {
    prit: string;

    title: string;

    mainStatus: string;

    labels: string[];

    position: string;

    totalTests: number | null;

    executionStatuses: ExecutionStatus[];

    issueLinks: IssueLink[];
    };


    /* =========================================================
    POSITION REPORT
    ========================================================= */

    export type PositionReport = {
    position: string;
    reports: Report[];
    };


    /* =========================================================
    DASHBOARD DEFECT
    =========================================================
    *
    * Gadget:
    *
    * Certification Open Defects
    *
    * Colunas:
    *
    * T
    * P
    * Key
    * Summary
    * Status
    * Assignee
    * Created
    */

    export type DashboardDefect = {
    issueType: string;

    priority: string;

    key: string;

    summary: string;

    status: string;

    assignee: string;

    created: string;
    };


    /* =========================================================
    DASHBOARD DATA
    ========================================================= */

    export type DashboardData = {
    pageId: string;

    /*
    * Nome completo encontrado no Jira.
    */
    rawTitle: string;

    /*
    * Nome utilizado no relatório.
    *
    * Exemplo:
    *
    * Release v5.3.0.36 Certification Open Defects
    */
    title: string;

    total: number;

    defects: DashboardDefect[];
    };
