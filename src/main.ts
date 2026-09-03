    import {
    PRITS
    } from './config/jira.config';

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
    writeReports
    } from './reports/report.writer';


    async function main() {

    /*
    * Validação simples.
    */

    if (
        PRITS.length === 0
    ) {

        throw new Error(
        'Nenhum PRIT configurado.'
        );

    }


    /*
    * Browser / Login
    */

    const {
        browser,
        page
    } =
        await createBrowserSession(
        PRITS[0]
        );


    const reports:
        Report[] = [];


    /*
    * Processa os PRITs
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
            `✅ ${prit} processado`
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
    * Gera arquivos
    */

    writeReports(
        reports
    );


    await browser.close();

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