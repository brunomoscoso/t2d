    import {
    Page
    } from 'playwright';

    import {
    SELECTORS
    } from '../config/selectors';

    import {
    ExecutionStatus
    } from '../types/report.types';


    export async function extractExecutionStatuses(
    page: Page
    ): Promise<ExecutionStatus[]> {

    console.log(
        'Procurando Overall Execution Status...'
    );


    const overallStatus =
        page
        .getByText(
            'Overall Execution Status',
            {
            exact: true
            }
        )
        .first();


    const found =
        await overallStatus
        .waitFor({

            state:
            'visible',

            timeout:
            20000

        })
        .then(
            () => true
        )
        .catch(
            () => false
        );


    if (!found) {

        console.log(
        '⚠️ Overall Execution Status não encontrado.'
        );

        return [];

    }


    await overallStatus
        .scrollIntoViewIfNeeded();


    await page.waitForTimeout(
        1000
    );


    /* =====================================================
        ESTRATÉGIA PRINCIPAL
        ===================================================== */

    const countsLocator =
        page.locator(
        SELECTORS.executionStatusCount
        );


    const namesLocator =
        page.locator(
        SELECTORS.executionStatusName
        );


    const totalCounts =
        await countsLocator.count();


    const totalNames =
        await namesLocator.count();


    if (
        totalCounts > 0 &&
        totalNames > 0
    ) {

        const counts =
        await countsLocator
            .allTextContents();


        const names =
        await namesLocator
            .allTextContents();


        const statuses:
        ExecutionStatus[] = [];


        const total =
        Math.min(
            counts.length,
            names.length
        );


        for (
        let i = 0;
        i < total;
        i++
        ) {

        const quantidade =
            Number(
            counts[i]
                .trim()
            );


        const status =
            names[i]
            .trim();


        if (
            !Number.isNaN(
            quantidade
            )
        ) {

            statuses.push({

            status,

            quantidade

            });

        }

        }


        return statuses;

    }


    /* =====================================================
        FALLBACK
        ===================================================== */

    console.log(
        'ℹ️ Utilizando fallback de texto.'
    );


    const summaryText =
        await overallStatus.evaluate(
        element => {

            let parent =
            element.parentElement;


            while (parent) {

            const text =
                parent.innerText;


            if (
                /Total Tests:\s*\d+/i
                .test(text)
            ) {

                return text;

            }


            parent =
                parent.parentElement;

            }


            return '';

        }
        );


    if (!summaryText) {

        return [];

    }


    const statusPart =
        summaryText
        .replace(
            /Overall Execution Status/i,
            ''
        )
        .split(
            /Total Tests:/i
        )[0]
        .replace(
            /\s+/g,
            ' '
        )
        .trim();


    const statuses:
        ExecutionStatus[] = [];


    const regex =
        /(\d+)\s+([A-Za-z][A-Za-z _-]*?)(?=\s+\d+\s+[A-Za-z]|\s*$)/g;


    let match:
        RegExpExecArray | null;


    while (
        (
        match =
            regex.exec(
            statusPart
            )
        ) !== null
    ) {

        statuses.push({

        quantidade:
            Number(
            match[1]
            ),

        status:
            match[2]
            .trim()
            .toUpperCase()

        });

    }


    return statuses;

    }