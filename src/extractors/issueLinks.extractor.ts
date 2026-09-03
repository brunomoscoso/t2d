    import {
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

    const keys =
        page.locator(
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
        * Encontra o container da linha
        * correspondente ao PRIT.
        */

        const row =
        keyElement.locator(

            `xpath=ancestor::*[
            .//span[contains(@class,"link-summary")]
            and
            .//span[contains(@class,"jira-issue-status-lozenge")]
            ][1]`

        );


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


        /*
        * Primeira estratégia.
        */

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


        /*
        * Fallback para created / blocked.
        */

        if (
        !relation ||
        relation === 'unknown'
        ) {

        const createdBefore =
            keyElement.locator(

            `xpath=preceding::*[
                normalize-space(text())="created"
            ][1]`

            );


        const blockedBefore =
            keyElement.locator(

            `xpath=preceding::*[
                normalize-space(text())="is blocked by"
            ][1]`

            );


        const createdCount =
            await createdBefore.count();


        const blockedCount =
            await blockedBefore.count();


        if (
            createdCount > 0 &&
            blockedCount === 0
        ) {

            relation =
            'created';

        }


        if (
            blockedCount > 0
        ) {

            relation =
            'is blocked by';

        }

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