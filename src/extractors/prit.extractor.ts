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
    getPosition
    } from '../utils/position.utils';


    export async function extractPrit(
    page: Page,
    prit: string
    ): Promise<Report> {

    console.log('\n');
    console.log('========================================');
    console.log(`Abrindo ${prit}`);
    console.log('========================================');

    await page.goto(
        `${JIRA_URL}/browse/${prit}`,
        {
        waitUntil: 'domcontentloaded'
        }
    );

    await page
        .locator(SELECTORS.title)
        .waitFor({
        state: 'visible',
        timeout: 60000
        });

    /* =====================================================
        TÍTULO
        ===================================================== */

    const title =
        (
        await page
            .locator(SELECTORS.title)
            .innerText()
        ).trim();

    console.log(`Título: ${title}`);

    /* =====================================================
        LABELS / POSIÇÃO
        ===================================================== */

    const labels =
        await extractLabels(page);

    console.log('Labels encontradas:', labels);

    const position =
        getPosition(labels, title);

    console.log(`Posição: ${position}`);

    /* =====================================================
        EXECUTION STATUS
        ===================================================== */

    const executionStatuses =
        await extractExecutionStatuses(page);

    /* =====================================================
        TOTAL TESTS
        ===================================================== */

    const totalTests =
        await extractTotalTests(page);

    /* =====================================================
        ISSUE LINKS
        ===================================================== */

    await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
    });

    await page.waitForTimeout(1000);

    const issueLinks =
        await extractIssueLinks(page);

    return {
        prit,
        title,
        labels,
        position,
        totalTests,
        executionStatuses,
        issueLinks
    };
    }