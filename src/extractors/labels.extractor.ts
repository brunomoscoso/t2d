    import {
    Page
    } from 'playwright';

    import {
    SELECTORS
    } from '../config/selectors';


    function cleanLabel(
    value: string
    ): string {

    return value
        .replace(/\s+/g, ' ')
        .trim();

    }


    export async function extractLabels(
    page: Page
    ): Promise<string[]> {

    const labels =
        new Set<string>();


    /*
    * Tenta todos os seletores candidatos.
    */

    for (
        const selector
        of SELECTORS.labelCandidates
    ) {

        const elements =
        page.locator(
            selector
        );


        const count =
        await elements.count();


        if (count === 0) {
        continue;
        }


        const contents =
        await elements
            .allTextContents();


        for (
        const content
        of contents
        ) {

        const label =
            cleanLabel(
            content
            );


        if (
            label &&
            label.toLowerCase() !== 'labels' &&
            label.toLowerCase() !== 'none'
        ) {

            labels.add(
            label
            );

        }

        }

    }


    const result =
        Array.from(
        labels
        );


    console.log(
        'Labels encontradas:',
        result
    );


    return result;

    }