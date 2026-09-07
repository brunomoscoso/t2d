    import {
    Locator,
    Page
    } from 'playwright';

    import {
    SELECTORS
    } from '../config/selectors';

    import {
    IssueLink
    } from '../types/report.types';


    export async function extractIssueLinks(
    page: Page
    ): Promise<IssueLink[]> {

    /*
    * Se existir o módulo padrão
    * Issue Links, limitamos a busca a ele.
    */

    let section:
        Locator;


    const linkingModule =
        page.locator(
        '#linkingmodule'
        );


    if (
        await linkingModule.count() > 0
    ) {

        section =
        linkingModule;

    }

    else {

        section =
        page.locator(
            'body'
        );

    }


    const keys =
        section.locator(
        SELECTORS.issueLinkKey
        );


    const total =
        await keys.count();


    console.log(
        `Issue Links encontrados: ${total}`
    );


    const results:
        IssueLink[] = [];


    for (
        let i = 0;
        i < total;
        i++
    ) {

        const keyElement =
        keys.nth(i);


        const prit =
        (
            await keyElement
            .innerText()
        )
            .trim();


        /*
        * Tenta primeiro encontrar
        * o DD correspondente.
        */

        let row =
        keyElement.locator(
            'xpath=ancestor::dd[1]'
        );


        if (
        await row.count() === 0
        ) {

        row =
            keyElement.locator(

            `xpath=ancestor::*[
                .//span[contains(@class,"link-summary")]
                and
                .//span[contains(@class,"jira-issue-status-lozenge")]
            ][1]`

            );

        }


        const titulo =
        (
            await row
            .locator(
                SELECTORS.issueLinkSummary
            )
            .first()
            .innerText()
            .catch(
                () => ''
            )
        )
            .trim();


        const status =
        (
            await row
            .locator(
                SELECTORS.issueLinkStatus
            )
            .first()
            .innerText()
            .catch(
                () => ''
            )
        )
            .trim();


        let relation =
        'unknown';


        const relationDt =
        keyElement.locator(

            'xpath=ancestor::dd[1]/preceding-sibling::dt[1]'

        );


        if (
        await relationDt.count() > 0
        ) {

        relation =
            (
            await relationDt
                .innerText()
                .catch(
                () => ''
                )
            )
            .trim();

        }


        results.push({

        relation,

        prit,

        titulo,

        status

        });

    }


    return results;

    }