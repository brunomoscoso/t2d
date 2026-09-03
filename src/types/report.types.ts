    export type ExecutionStatus = {
    status: string;
    quantidade: number;
    };


    export type IssueLink = {
    relation: string;
    prit: string;
    titulo: string;
    status: string;
    };


    export type Report = {
    prit: string;
    title: string;

    totalTests:
        number | null;

    executionStatuses:
        ExecutionStatus[];

    issueLinks:
        IssueLink[];
    };