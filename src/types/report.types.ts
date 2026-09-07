    export type ExecutionStatus = {
    status: string;
    quantidade: number;
    };


    export type IssueLink = {
    relation: string;
    prit: string;
    titulo: string;
    status: string;

    /*
    * Highest
    * High
    * Medium
    * Low
    * Lowest
    */
    priority: string;
    };


    export type Report = {
    prit: string;

    title: string;

    labels: string[];

    position: string;

    totalTests: number | null;

    executionStatuses:
        ExecutionStatus[];

    issueLinks:
        IssueLink[];
    };


    export type PositionReport = {
    position: string;

    reports: Report[];
    };