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


    export function getStatusClass(
    status: string
    ): string {

    const normalized =
        status
        .trim()
        .toUpperCase();


    if (
        normalized === 'PASS'
    ) {

        return 'status-pass';

    }


    if (
        normalized === 'FAIL'
    ) {

        return 'status-fail';

    }


    if (
        normalized === 'BLOCKED'
    ) {

        return 'status-blocked';

    }


    return 'status-other';

    }


    export function getStatusColors(
    status: string
    ) {

    const normalized =
        status
        .trim()
        .toUpperCase();


    if (
        normalized === 'PASS'
    ) {

        return {

        background:
            '#e8f5d6',

        color:
            '#4f7f1f',

        border:
            '#95c160'

        };

    }


    if (
        normalized === 'FAIL'
    ) {

        return {

        background:
            '#fde8e7',

        color:
            '#c0392b',

        border:
            '#d85b53'

        };

    }


    if (
        normalized === 'BLOCKED'
    ) {

        return {

        background:
            '#ffe5fa',

        color:
            '#cc009f',

        border:
            '#ff00cc'

        };

    }


    return {

        background:
        '#e9f2ff',

        color:
        '#0747a6',

        border:
        '#6b9ee8'

    };

    }