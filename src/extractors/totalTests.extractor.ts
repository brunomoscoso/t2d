    import {
    Page
    } from 'playwright';


    export async function extractTotalTests(
    page: Page
    ): Promise<number | null> {

    const locator =
        page
        .getByText(
            /Total Tests:\s*\d+/i
        )
        .first();


    const exists =
        await locator
        .isVisible()
        .catch(
            () => false
        );


    if (!exists) {

        console.log(
        '⚠️ Total Tests não encontrado.'
        );

        return null;
    }


    const text =
        await locator.innerText();


    const match =
        text.match(
        /Total Tests:\s*(\d+)/i
        );


    if (!match) {
        return null;
    }


    return Number(
        match[1]
    );
    }