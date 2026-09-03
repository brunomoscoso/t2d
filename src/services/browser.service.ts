    import {
    Browser,
    Page,
    chromium
    } from 'playwright';

    import readline
    from 'node:readline/promises';

    import {
    stdin as input,
    stdout as output
    } from 'node:process';

    import {
    JIRA_URL
    } from '../config/jira.config';


    type BrowserSession = {
    browser: Browser;
    page: Page;
    };


    export async function createBrowserSession(
    firstPrit: string
    ): Promise<BrowserSession> {

    const browser =
        await chromium.launch({

        channel:
            'msedge',

        headless:
            false

        });


    const context =
        await browser.newContext();


    const page =
        await context.newPage();


    console.log(
        '\nAbrindo Jira...'
    );


    await page.goto(
        `${JIRA_URL}/browse/${firstPrit}`
    );


    console.log(
        '\nFaça o login corporativo normalmente.'
    );

    console.log(
        'Conclua Microsoft / MFA / Authenticator.'
    );


    const rl =
        readline.createInterface({
        input,
        output
        });


    await rl.question(
        '\nQuando o Jira estiver aberto, pressione ENTER... '
    );


    rl.close();


    return {
        browser,
        page
    };
    }