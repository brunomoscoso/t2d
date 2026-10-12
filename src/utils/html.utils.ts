    /* =========================================================
    ESCAPE HTML
    ========================================================= */

    export function escapeHtml(
    value: string
    ): string {

    return value
        .replace(
        /&/g,
        '&amp;'
        )
        .replace(
        /</g,
        '&lt;'
        )
        .replace(
        />/g,
        '&gt;'
        )
        .replace(
        /"/g,
        '&quot;'
        )
        .replace(
        /'/g,
        '&#039;'
        );

    }


    /* =========================================================
    NORMALIZA STATUS
    ========================================================= */

    export function normalizeStatus(
    status: string
    ): string {

    return status
        .trim()
        .toUpperCase()
        .replace(
        /[\s-]+/g,
        '_'
        );

    }


    /* =========================================================
    EXECUTION STATUS CLASS
    ========================================================= */

    export function getStatusClass(
    status: string
    ): string {

    const normalized =
        normalizeStatus(
        status
        );


    if (normalized === 'PASS') {
        return 'status-pass';
    }

    if (normalized === 'FAIL') {
        return 'status-fail';
    }

    if (normalized === 'EXECUTING') {
        return 'status-executing';
    }

    if (
        normalized === 'TO_DO' ||
        normalized === 'TODO'
    ) {
        return 'status-todo';
    }

    if (normalized === 'ABORTED') {
        return 'status-aborted';
    }

    if (normalized === 'FOR_TESTING') {
        return 'status-for-testing';
    }

    if (normalized === 'PENDING_3RD') {
        return 'status-pending-3rd';
    }

    if (normalized === 'BLOCKED') {
        return 'status-blocked';
    }


    return 'status-other';
    }


    /* =========================================================
    CORES EXECUTION STATUS
    ========================================================= */

    export function getStatusColors(
    status: string
    ) {

    const normalized =
        normalizeStatus(
        status
        );


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


    if (normalized === 'EXECUTING') {

        return {
        background: '#fff4cc',
        color: '#806600',
        border: '#e5c84a'
        };

    }


    if (
        normalized === 'TO_DO' ||
        normalized === 'TODO'
    ) {

        return {
        background: '#eeeeee',
        color: '#555555',
        border: '#aaaaaa'
        };

    }


    if (normalized === 'ABORTED') {

        return {
        background: '#222222',
        color: '#ffffff',
        border: '#000000'
        };

    }


    if (normalized === 'FOR_TESTING') {

        return {
        background: '#efe4ff',
        color: '#6f42c1',
        border: '#a77be8'
        };

    }


    if (normalized === 'PENDING_3RD') {

        return {
        background: '#e9f2ff',
        color: '#0747a6',
        border: '#6b9ee8'
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
        background: '#f4f5f7',
        color: '#5e6c84',
        border: '#c1c7d0'
    };
    }


    /* =========================================================
    STATUS PRINCIPAL DO PRIT
    ========================================================= */

    export function getIssueStatusColors(
    status: string
    ) {

    const normalized =
        normalizeStatus(
        status
        );


    /* DONE */

    if (
        normalized === 'DONE' ||
        normalized === 'CLOSED' ||
        normalized === 'RESOLVED'
    ) {

        return {
        background: '#e3fcef',
        color: '#006644',
        border: '#79f2c0'
        };

    }


    /* IN PROGRESS */

    if (
        normalized === 'IN_PROGRESS'
    ) {

        return {
        background: '#deebff',
        color: '#0747a6',
        border: '#4c9aff'
        };

    }


    /* TO DO */

    if (
        normalized === 'TO_DO' ||
        normalized === 'TODO' ||
        normalized === 'OPEN'
    ) {

        return {
        background: '#dfe1e6',
        color: '#42526e',
        border: '#a5adba'
        };

    }


    /* BLOCKED */

    if (
        normalized === 'BLOCKED'
    ) {

        return {
        background: '#ffe5fa',
        color: '#cc009f',
        border: '#ff8fda'
        };

    }


    /* EXECUTING */

    if (
        normalized === 'EXECUTING'
    ) {

        return {
        background: '#fff4cc',
        color: '#806600',
        border: '#e5c84a'
        };

    }


    /* ABORTED */

    if (
        normalized === 'ABORTED'
    ) {

        return {
        background: '#222222',
        color: '#ffffff',
        border: '#000000'
        };

    }


    /* FOR TESTING */

    if (
        normalized === 'FOR_TESTING'
    ) {

        return {
        background: '#efe4ff',
        color: '#6f42c1',
        border: '#a77be8'
        };

    }


    /* PENDING 3RD */

    if (
        normalized === 'PENDING_3RD'
    ) {

        return {
        background: '#e9f2ff',
        color: '#0747a6',
        border: '#6b9ee8'
        };

    }


    return {
        background: '#f4f5f7',
        color: '#5e6c84',
        border: '#c1c7d0'
    };

    }


    /* =========================================================
    PRIORIDADE
    ========================================================= */

    export function getPriorityMeta(
    priority: string
    ) {

    const normalized =
        priority
        .trim()
        .toLowerCase();


    if (normalized === 'highest') {

        return {
        symbol: '⇈',
        color: '#d04437',
        label: 'Highest'
        };

    }


    if (normalized === 'high') {

        return {
        symbol: '↑',
        color: '#d04437',
        label: 'High'
        };

    }


    if (normalized === 'medium') {

        return {
        symbol: '=',
        color: '#f39c12',
        label: 'Medium'
        };

    }


    if (normalized === 'low') {

        return {
        symbol: '↓',
        color: '#0065ff',
        label: 'Low'
        };

    }


    if (normalized === 'lowest') {

        return {
        symbol: '⇊',
        color: '#0065ff',
        label: 'Lowest'
        };

    }


    return {
        symbol: '•',
        color: '#6b778c',
        label: 'Unknown'
    };

    }
