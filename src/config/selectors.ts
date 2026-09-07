    export const SELECTORS = {

    /* =====================================================
        PRIT
        ===================================================== */

    title:
        '#summary-val',


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


    /*
    * A prioridade do Jira costuma aparecer
    * principalmente através de:
    *
    * alt="High"
    * title="High"
    *
    * Mas tentamos várias possibilidades
    * para ficar mais resistente.
    */
    issueLinkPriorityCandidates: [

        '.priority img',

        '[class*="priority"] img',

        '[class*="priority"]',

        'img[alt]',

        'img[title]',

        '[data-priority]',

        '[title]',

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

    ]

    };