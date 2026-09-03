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
    } from './executionStatus.extractor';

    import {
    extractIssueLinks
    } from './issueLinks.extractor';


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


    await page.goto(

        `${JIRA_URL}/browse/${prit}`,

        {
        waitUntil:
            'domcontentloaded'
        }

    );


    /*
    * Espera o Jira principal carregar.
    */

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


    /*
    * TÍTULO
    */

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


    /*
    * EXECUTION STATUS
    */

    const executionStatuses =
        await extractExecutionStatuses(
        page
        );


    /*
    * TOTAL TESTS
    */

    const totalTests =
        await extractTotalTests(
        page
        );


    /*
    * Scroll para Issue Links.
    */

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


    /*
    * ISSUE LINKS
    */

    const issueLinks =
        await extractIssueLinks(
        page
        );


    return {

        prit,

        title,

        totalTests,

        executionStatuses,

        issueLinks

    };

    }