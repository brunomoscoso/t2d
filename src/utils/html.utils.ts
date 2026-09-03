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