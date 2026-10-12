    import {
    PRITS,
    DASHBOARD_PAGE_ID
    } from './config/operations.config';

    import {
    DashboardData,
    Report
    } from './types/report.types';

    import {
    createBrowserSession
    } from './services/browser.service';

    import {
    extractPrit
    } from './extractors/prit.extractor';

    import {
    extractDashboard
    } from './extractors/dashboard.extractor';

    import { extractReleaseLinks } from './extractors/release-links.extractor';
    import { extractTestPlanExecutions } from './extractors/test-plan-executions.extractor';

    import {
    groupReportsByPosition
    } from './utils/groupReports.utils';

    import {
    writeReports
    } from './reports/report.writer';

    const MAX_PRIT_ATTEMPTS = 3;

    async function extractPritWithRetry(
        page: import('playwright').Page,
        prit: string,
    ): Promise<Report> {
        let lastError: unknown;

        for (let attempt = 1; attempt <= MAX_PRIT_ATTEMPTS; attempt++) {
            try {
                return await extractPrit(page, prit);
            } catch (error) {
                lastError = error;
                console.error(
                    `⚠️ Falha ao extrair ${prit} (tentativa ${attempt}/${MAX_PRIT_ATTEMPTS}).`,
                    error,
                );

                if (attempt < MAX_PRIT_ATTEMPTS) {
                    await page.waitForTimeout(1000 * attempt);
                }
            }
        }

        throw new Error(
            `Não foi possível extrair ${prit} após ${MAX_PRIT_ATTEMPTS} tentativas; o relatório não será gerado.`,
            { cause: lastError },
        );
    }

    async function main() {

    /* =====================================================
        VALIDATIONS
        ===================================================== */

    if (
        PRITS.length === 0
    ) {

        throw new Error(
        'Nenhum PRIT configurado.'
        );

    }


    if (
        !DASHBOARD_PAGE_ID
    ) {

        throw new Error(
        'Nenhum Dashboard configurado.'
        );

    }


    /* =====================================================
        BROWSER
        ===================================================== */

    const {
        browser,
        page
    } =
        await createBrowserSession(
        PRITS[0]
        );


    try {

        const reports:
        Report[] = [];


        /* ===================================================
        PRITS
        =================================================== */

        for (
        const prit
        of PRITS
        ) {

            const report =
            await extractPritWithRetry(
                page,
                prit
            );


            reports.push(
            report
            );


            console.log(
            `✅ ${prit} → ${report.position}`
            );

        }


        /* ===================================================
        AGRUPAMENTO
        =================================================== */

        const positions =
        groupReportsByPosition(
            reports
        );

        // Reutiliza o login para obter os nomes dos planos e do dashboard.
        const releaseLinks = await extractReleaseLinks(page.request);
        releaseLinks.testPlans = await extractTestPlanExecutions(page.request, releaseLinks.testPlans);


        /* ===================================================
        DASHBOARD
        ===================================================
        *
        * Dashboard é independente.
        *
        * Se falhar, os PRITs continuam
        * gerando relatório normalmente.
        */

        let dashboard:
        DashboardData | undefined;


        const dashboardPage =
        await page
            .context()
            .newPage();


        try {

        dashboard =
            await extractDashboard(
            dashboardPage,
            DASHBOARD_PAGE_ID
            );


        console.log(
            `✅ Dashboard ${DASHBOARD_PAGE_ID} extraído`
        );

        }

        catch (error) {

        console.error(
            '❌ Não foi possível extrair o Dashboard.'
        );


        console.error(
            error
        );

        }

        finally {

        await dashboardPage.close();

        }


        /* ===================================================
        REPORT
        =================================================== */

        writeReports(
        positions,
        dashboard,
        releaseLinks
        );

    }

    finally {

        await browser.close();

    }

    }


    /* =========================================================
    START
    ========================================================= */

    main()
    .catch(
        error => {

        console.error(
            '❌ Erro fatal na execução:'
        );


        console.error(
            error
        );


        process.exit(1);

        }
    );
