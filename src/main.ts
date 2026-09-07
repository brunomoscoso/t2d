    import {
    PRITS
    } from './config/prits.config';

    import {
    Report
    } from './types/report.types';

    import {
    createBrowserSession
    } from './services/browser.service';

    import {
    extractPrit
    } from './extractors/prit.extractor';

    import {
    groupReportsByPosition
    } from './utils/groupReports.utils';

    import {
    writeReports
    } from './reports/report.writer';


    async function main() {

    if (
        PRITS.length === 0
    ) {

        throw new Error(
        'Nenhum PRIT configurado.'
        );

    }


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


        /*
        * Percorre todos os PRITs.
        */

        for (
        const prit
        of PRITS
        ) {

        try {

            const report =
            await extractPrit(
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

        catch (error) {

            console.error(
            `❌ Erro ao processar ${prit}`
            );

            console.error(
            error
            );

        }

        }


        /*
        * Agrupa automaticamente
        * pela posição encontrada nas Labels.
        */

        const positions =
        groupReportsByPosition(
            reports
        );


        /*
        * Gera todos os arquivos.
        */

        writeReports(
        positions
        );

    }

    finally {

        await browser.close();

    }

    }


    main()
    .catch(
        error => {

        console.error(
            error
        );

        process.exit(
            1
        );

        }
    );