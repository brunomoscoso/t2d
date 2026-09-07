    export const SELECTORS = {

    title:
        '#summary-val',

    executionStatusCount:
        'span.testexec-status-count',

    executionStatusName:
        'span.testexec-status-name',

    issueLinkKey:
        'a.issue-link.link-title',

    issueLinkSummary:
        'span.link-summary',

    issueLinkStatus:
        'span.jira-issue-status-lozenge',

    /*
    * Possíveis seletores para Labels.
    *
    * Depois vamos confirmar qual deles
    * funciona no seu Jira.
    */
    labelCandidates: [

        '#labels-wrap a',

        '#labels-wrap .value',

        '#labels-wrap span',

        '[data-field-id="labels"] a',

        '[data-field-id="labels"] span'

    ]

    };