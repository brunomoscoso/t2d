export type TestType = 'smoke' | 'regression' | 'certification' | 'defectFixing';

export type ReportGroup = TestType | 'portugal' | 'espanha';

export type CountryTestPlans = { portugal: string; espanha: string };

export type PositionDefinition = {
  name: string;
  testPlanPrit?: string;
  executions?: Record<TestType, string[]>;
  testPlans?: CountryTestPlans;
};

export type ResolvedPositionDefinition = PositionDefinition & {
  testPlanPrit: string;
  executions: Record<TestType, string[]>;
};

export type ConfiguredExecution = {
  prit: string;
  position: string;
  testType: ReportGroup;
};

export type TestPlanLink = {
  position: string;
  label?: string;
  prit: string;
  title?: string;
};

export type ReleaseLinks = {
  testPlans: TestPlanLink[];
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

export type ExecutionData = {
  prit: string;

  fixVersions?: string[];

  title: string;

  mainStatus: string;

  labels: string[];

  totalTests: number | null;

  executionStatuses: ExecutionStatus[];

  issueLinks: IssueLink[];
};

// Posição e tipo são atribuídos exclusivamente pela configuração, após a coleta.
export type Report = ExecutionData & ConfiguredExecution;

/* =========================================================
    POSITION REPORT
    ========================================================= */

export type PositionReport = {
  position: string;
  testPlanPrit: string;
  fixVersions?: string[];
  testPlans?: CountryTestPlans;
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
