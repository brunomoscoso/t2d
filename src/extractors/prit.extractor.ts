    import {
    Page
    } from 'playwright';

    import {
    JIRA_URL
    } from '../config/jira.config';

    import {
    SELECTORS
    } from '../config/selectors';

    import {
    Report
    } from '../types/report.types';

    import {
    extractTotalTests
    } from './totalTests.extractor';

    import {
    extractExecutionStatuses
    } from './execution-status.extractor';

    import {
    extractIssueLinks
    } from './issueLinks.extractor';

    import {
    extractLabels
    } from './labels.extractor';

    import {
    extractMainStatus
    } from './mainStatus.extractor';

    import {
    getPosition
    } from '../utils/position.utils';


    /* =========================================================
    EXTRAI UM PRIT
    ========================================================= */

    export async function extractPrit(
    page: Page,
    prit: string
    ): Promise<Report> {

    console.log('\n');

    console.log(
        '========================================'
    );

    console.log(
        `Abrindo ${prit}`
    );

    console.log(
        '========================================'
    );


    /* =====================================================
        ABRE PRIT
        ===================================================== */

    await page.goto(

        `${JIRA_URL}/browse/${prit}`,

        {
        waitUntil:
            'domcontentloaded'
        }

    );


    /* =====================================================
        AGUARDA TÍTULO
        ===================================================== */

    await page
        .locator(
        SELECTORS.title
        )
        .waitFor({

        state:
            'visible',

        timeout:
            60000

        });


    /* =====================================================
        TÍTULO
        ===================================================== */

    const title =
        (
        await page
            .locator(
            SELECTORS.title
            )
            .innerText()
        )
        .trim();


    console.log(
        `Título: ${title}`
    );


    /* =====================================================
        STATUS PRINCIPAL
        ===================================================== */

    const mainStatus =
        await extractMainStatus(
        page
        );


    /* =====================================================
        LABELS
        ===================================================== */

    const labels =
        await extractLabels(
        page
        );


    console.log(
        'Labels:',
        labels
    );


    /* =====================================================
        POSIÇÃO
        ===================================================== */

    const position =
        getPosition(
        labels,
        title
        );


    console.log(
        `Posição: ${position}`
    );


    /* =====================================================
        EXECUTION STATUS
        ===================================================== */

    const executionStatuses =
        await extractExecutionStatuses(
        page
        );


    /* =====================================================
        TOTAL TESTS
        ===================================================== */

    const totalTests =
        await extractTotalTests(
        page
        );


    /* =====================================================
        ISSUE LINKS
        ===================================================== */

    await page.evaluate(
        () => {

        window.scrollTo(
            0,
            document.body.scrollHeight
        );

        }
    );


    await page.waitForTimeout(
        1000
    );


    const issueLinks =
        await extractIssueLinks(
        page
        );


    /* =====================================================
        RESULTADO
        ===================================================== */

    return {

        prit,

        title,

        mainStatus,

        labels,

        position,

        totalTests,

        executionStatuses,

        issueLinks

    };

    }