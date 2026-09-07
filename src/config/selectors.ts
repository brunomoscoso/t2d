    export const SELECTORS = {

    /* =====================================================
        PRIT
        ===================================================== */

    title:
        '#summary-val',


    /* =====================================================
        STATUS PRINCIPAL DO PRIT
        ===================================================== */

    mainStatusCandidates: [

        '#status-val',

        'span#status-val',

        '.status-view span.dropdown-text',

        'span.dropdown-text'

    ],


    /* =====================================================
        XRAY EXECUTION STATUS
        ===================================================== */

    executionStatusCount:
        'span.testexec-status-count',

    executionStatusName:
        'span.testexec-status-name',


    /* =====================================================
        ISSUE LINKS
        ===================================================== */

    issueLinkKey:
        'a.issue-link.link-title',

    issueLinkSummary:
        'span.link-summary',

    issueLinkStatus:
        'span.jira-issue-status-lozenge',


    issueLinkPriorityCandidates: [

        '.priority img',

        '[class*="priority"] img',

        '[class*="priority"]',

        'img[alt]',

        'img[title]',

        '[data-priority]',

        '[aria-label]'

    ],


    /* =====================================================
        LABELS
        ===================================================== */

    labelCandidates: [

        '#labels-wrap a',

        '#labels-wrap .value',

        '#labels-wrap span',

        '[data-field-id="labels"] a',

        '[data-field-id="labels"] span'

    ],


    /* =====================================================
        DASHBOARD
        ===================================================== */

    dashboard: {

    /*
    * Título do gadget.
    */
    gadgetTitle:
        'h2.dashboard-item-title',

    /*
    * A tabela será procurada SOMENTE
    * dentro do dashboard-item-content
    * correspondente ao título encontrado.
    */
    table:
        'table.issue-table',

    /*
    * Cada linha é uma issue Jira.
    */
    rows:
        'tbody tr.issuerow',

    /*
    * Células da issue.
    */
    cells:
        'td'

    }
}