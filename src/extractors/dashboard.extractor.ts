    import {
    Locator,
    Page
    } from 'playwright';

    import {
    JIRA_URL
    } from '../config/jira.config';

    import {
    SELECTORS
    } from '../config/selectors';

    import {
    DashboardData,
    DashboardDefect
    } from '../types/report.types';


    /* =========================================================
    CLEAN TEXT
    ========================================================= */

    function cleanText(
    value: string
    ): string {

    return value
        .replace(/\s+/g, ' ')
        .trim();
    }


    /* =========================================================
    NORMALIZA PRIORIDADE
    ========================================================= */

    function normalizePriority(
    value: string
    ): string | null {

    const normalized =
        cleanText(
        value
        );


    const match =
        normalized.match(
        /\b(Highest|High|Medium|Lowest|Low)\b/i
        );


    if (match) {

        const priority =
        match[1]
            .toLowerCase();


        if (
        priority === 'highest'
        ) {
        return 'Highest';
        }


        if (
        priority === 'high'
        ) {
        return 'High';
        }


        if (
        priority === 'medium'
        ) {
        return 'Medium';
        }


        if (
        priority === 'low'
        ) {
        return 'Low';
        }


        if (
        priority === 'lowest'
        ) {
        return 'Lowest';
        }

    }


    /*
    * Fallback para símbolos.
    */

    if (
        /⇈|↑↑/.test(
        normalized
        )
    ) {
        return 'Highest';
    }


    if (
        /⇊|↓↓/.test(
        normalized
        )
    ) {
        return 'Lowest';
    }


    if (
        /↑/.test(
        normalized
        )
    ) {
        return 'High';
    }


    if (
        /=/.test(
        normalized
        )
    ) {
        return 'Medium';
    }


    if (
        /↓/.test(
        normalized
        )
    ) {
        return 'Low';
    }


    return null;
    }




    /* =========================================================
    SCROLL LENTO ATÉ O FINAL DO DASHBOARD
    ========================================================= */

    async function slowScrollToBottom(
    page: Page
    ): Promise<void> {

    console.log(
        'Scrollando Dashboard lentamente até o final...'
    );


    await page.evaluate(
        async () => {

        await new Promise<void>(
            resolve => {

            const distance =
                250;

            const interval =
                500;

            const maxSteps =
                200;

            let steps =
                0;

            let bottomChecks =
                0;


            const timer =
                window.setInterval(
                () => {

                steps++;


                const pageHeight =
                    Math.max(
                    document.body.scrollHeight,
                    document.documentElement.scrollHeight
                    );


                const currentPosition =
                    window.scrollY +
                    window.innerHeight;


                /*
                * Precisamos confirmar o final algumas vezes,
                * porque o Jira pode aumentar a altura da página
                * depois de renderizar novos gadgets.
                */

                if (
                    currentPosition >=
                    pageHeight - 10
                ) {

                    bottomChecks++;

                }

                else {

                    bottomChecks = 0;


                    window.scrollBy({
                    top:
                        distance,

                    left:
                        0,

                    behavior:
                        'smooth'
                    });

                }


                /*
                * Três verificações seguidas no final:
                * aproximadamente 1,5 segundo.
                */

                if (
                    bottomChecks >= 3 ||
                    steps >= maxSteps
                ) {

                    window.clearInterval(
                    timer
                    );


                    resolve();

                }

                },
                interval
            );

            }
        );

        }
    );


    /*
    * Pequena espera final para o Jira
    * terminar de renderizar o último gadget.
    */

    await page.waitForTimeout(
        1500
    );


    console.log(
        '✅ Scroll lento do Dashboard concluído.'
    );

    }

    /* =========================================================
    LOCALIZA O GADGET OPEN DEFECTS
    =========================================================
    *
    * Estrutura real do Jira:
    *
    * dashboard-item-header
    *   └── h2.dashboard-item-title
    *
    * dashboard-item-content   ← próxima DIV
    *   └── ...
    *       └── table.issue-table
    */

    async function findOpenDefectsGadget(
    page: Page
    ): Promise<{
    content: Locator;
    rawTitle: string;
    title: string;
    }> {

    console.log(
        'Procurando Certification Open Defects...'
    );


    /* =====================================================
        1. TÍTULO CORRETO
        ===================================================== */

    const heading =
        page
        .locator(
            SELECTORS.dashboard.gadgetTitle
        )
        .filter({
            hasText:
            /Certification\s+Open\s+Defects/i
        })
        .first();


    await heading.waitFor({
        state:
        'visible',

        timeout:
        60000
    });


    /* =====================================================
        2. TEXTO DO TÍTULO
        ===================================================== */

    const rawTitle =
        cleanText(
        await heading.innerText()
        );


    if (
        !/Certification\s+Open\s+Defects/i.test(
        rawTitle
        )
    ) {

        throw new Error(
        'O título encontrado não corresponde a Certification Open Defects.'
        );

    }


    console.log(
        `✅ Título encontrado: ${rawTitle}`
    );


    /*
    * Remove:
    *
    * Filter Results:
    *
    * Exemplo final:
    *
    * Release v5.6.0.9 Certification Open Defects
    */

    const title =
        rawTitle
        .replace(
            /^Filter Results:\s*/i,
            ''
        )
        .trim();


    console.log(
        `Título utilizado: ${title}`
    );


    /* =====================================================
        3. HEADER QUE CONTÉM O H2
        ===================================================== */

    const header =
        heading
        .locator(
            `xpath=ancestor::div[
            contains(
                concat(
                " ",
                normalize-space(@class),
                " "
                ),
                " dashboard-item-header "
            )
            ][1]`
        )
        .first();


    const headerExists =
        await header
        .count();


    if (
        headerExists === 0
    ) {

        throw new Error(
        'dashboard-item-header do Open Defects não encontrado.'
        );

    }


    console.log(
        '✅ Header do gadget encontrado.'
    );


    /* =====================================================
        4. PRÓXIMA DIV:
            dashboard-item-content
        =====================================================
    *
    * Pela estrutura real mostrada:
    *
    * <div class="dashboard-item-header">
    *   ...
    * </div>
    *
    * <div class="dashboard-item-content">
    *   ...
    * </div>
    */

    const content =
        header
        .locator(
            `xpath=following-sibling::div[
            contains(
                concat(
                " ",
                normalize-space(@class),
                " "
                ),
                " dashboard-item-content "
            )
            ][1]`
        )
        .first();


    await content.waitFor({
        state:
        'visible',

        timeout:
        60000
    });


    console.log(
        '✅ dashboard-item-content correto encontrado.'
    );


    /* =====================================================
        5. CONFIRMA A TABELA SOMENTE NESSE CONTENT
        ===================================================== */

    const table =
        content
        .locator(
            SELECTORS.dashboard.table
        )
        .first();


    await table.waitFor({
        state:
        'visible',

        timeout:
        60000
    });


    console.log(
        '✅ Tabela Open Defects encontrada.'
    );


    return {

        content,

        rawTitle,

        title

    };
    }


    /* =========================================================
    LOCALIZA A TABELA
    =========================================================
    *
    * Essa função recebe SOMENTE o content
    * do gadget já validado.
    *
    * Portanto outras issue-table existentes
    * no Dashboard não interferem.
    */

    async function findDefectsTable(
    content: Locator
    ): Promise<Locator> {

    const tables =
        content.locator(
        SELECTORS.dashboard.table
        );


    const total =
        await tables.count();


    if (
        total === 0
    ) {

        throw new Error(
        'Nenhuma issue-table encontrada dentro de Open Defects.'
        );

    }


    /*
    * Normalmente teremos apenas uma.
    *
    * Mesmo assim validamos pelos headers.
    */

    for (
        let i = 0;
        i < total;
        i++
    ) {

        const table =
        tables.nth(i);


        const headers =
        (
            await table
            .locator(
                'thead th'
            )
            .allTextContents()
        )
            .map(
            cleanText
            );


        const normalizedHeaders =
        headers.map(
            header =>
            header.toLowerCase()
        );


        const valid =
        normalizedHeaders.includes(
            'key'
        ) &&
        normalizedHeaders.includes(
            'summary'
        ) &&
        normalizedHeaders.includes(
            'status'
        ) &&
        normalizedHeaders.includes(
            'assignee'
        ) &&
        normalizedHeaders.includes(
            'created'
        );


        if (
        valid
        ) {

        return table;

        }

    }


    throw new Error(
        'A tabela encontrada dentro de Open Defects não possui os headers esperados.'
    );
    }


    /* =========================================================
    ÍNDICES DAS COLUNAS
    =========================================================
    *
    * Não dependemos apenas de:
    *
    * 0,1,2,3...
    *
    * Primeiro tentamos descobrir a coluna
    * pelo próprio header.
    */

    async function getColumnIndexes(
    table: Locator
    ) {

    const headers =
        (
        await table
            .locator(
            'thead th'
            )
            .allTextContents()
        )
        .map(
            cleanText
        );


    const find =
        (
        name: string
        ) => {

        return headers.findIndex(
            header =>
            header
                .toLowerCase() ===
            name.toLowerCase()
        );

        };


    return {

        type:
        find('T') >= 0
            ? find('T')
            : 0,

        priority:
        find('P') >= 0
            ? find('P')
            : 1,

        key:
        find('Key') >= 0
            ? find('Key')
            : 2,

        summary:
        find('Summary') >= 0
            ? find('Summary')
            : 3,

        status:
        find('Status') >= 0
            ? find('Status')
            : 4,

        assignee:
        find('Assignee') >= 0
            ? find('Assignee')
            : 5,

        created:
        find('Created') >= 0
            ? find('Created')
            : 6

    };
    }


    /* =========================================================
    ISSUE TYPE
    ========================================================= */

    async function extractIssueType(
    cell: Locator
    ): Promise<string> {

    const elements =
        cell.locator(
        'img, [title], [aria-label]'
        );


    const total =
        await elements.count();


    for (
        let i = 0;
        i < total;
        i++
    ) {

        const element =
        elements.nth(i);


        const values = [

        await element
            .getAttribute(
            'alt'
            ),

        await element
            .getAttribute(
            'title'
            ),

        await element
            .getAttribute(
            'aria-label'
            )

        ];


        for (
        const value
        of values
        ) {

        if (!value) {
            continue;
        }


        if (
            /defect|bug/i.test(
            value
            )
        ) {

            return cleanText(
            value
            );

        }

        }

    }


    /*
    * O gadget é especificamente
    * Certification Open Defects.
    */

    return 'Defect';
    }


    /* =========================================================
    PRIORIDADE
    ========================================================= */

    async function extractPriority(
    cell: Locator
    ): Promise<string> {

    const elements =
        cell.locator(
        'img, [title], [aria-label], [class]'
        );


    const total =
        await elements.count();


    for (
        let i = 0;
        i < total;
        i++
    ) {

        const element =
        elements.nth(i);


        const values = [

        await element
            .getAttribute(
            'alt'
            ),

        await element
            .getAttribute(
            'title'
            ),

        await element
            .getAttribute(
            'aria-label'
            ),

        await element
            .getAttribute(
            'class'
            )

        ];


        for (
        const value
        of values
        ) {

        if (!value) {
            continue;
        }


        const priority =
            normalizePriority(
            value
            );


        if (priority) {

            return priority;

        }

        }

    }


    /*
    * Fallback pelo texto da própria célula.
    */

    const text =
        await cell
        .innerText()
        .catch(
            () => ''
        );


    return (
        normalizePriority(
        text
        ) ??
        'Unknown'
    );
    }


    /* =========================================================
    LÊ CÉLULA
    ========================================================= */

    async function readCell(
    cells: Locator,
    index: number
    ): Promise<string> {

    const total =
        await cells.count();


    if (
        index < 0 ||
        index >= total
    ) {

        return '';

    }


    return cleanText(
        await cells
        .nth(
            index
        )
        .innerText()
        .catch(
            () => ''
        )
    );
    }


    /* =========================================================
    EXTRAI DEFECTS DA PÁGINA ATUAL
    ========================================================= */

    async function extractCurrentPage(
    table: Locator
    ): Promise<DashboardDefect[]> {

    const indexes =
        await getColumnIndexes(
        table
        );


    const rows =
        table.locator(
        SELECTORS.dashboard.rows
        );


    const totalRows =
        await rows.count();


    console.log(
        `Linhas de defects encontradas: ${totalRows}`
    );


    const defects:
        DashboardDefect[] = [];


    for (
        let i = 0;
        i < totalRows;
        i++
    ) {

        const row =
        rows.nth(i);


        /* =====================================================
        KEY
        =====================================================
        *
        * O Jira já entrega:
        *
        * <tr
        *   data-issuekey="PRIT-7831"
        *   class="issuerow"
        * >
        */

        let key =
        (
            await row
            .getAttribute(
                'data-issuekey'
            )
        )?.trim() ?? '';


        const cells =
        row.locator(
            SELECTORS.dashboard.cells
        );


        /*
        * Fallback caso data-issuekey não exista.
        */

        if (!key) {

        key =
            await readCell(
            cells,
            indexes.key
            );

        }


        if (
        !/^[A-Za-z]+-\d+$/.test(
            key
        )
        ) {

        continue;

        }


        /* =====================================================
        DEFECT
        ===================================================== */

        const defect:
        DashboardDefect = {

        issueType:
            await extractIssueType(
            cells.nth(
                indexes.type
            )
            ),

        priority:
            await extractPriority(
            cells.nth(
                indexes.priority
            )
            ),

        key,

        summary:
            await readCell(
            cells,
            indexes.summary
            ),

        status:
            await readCell(
            cells,
            indexes.status
            ),

        assignee:
            await readCell(
            cells,
            indexes.assignee
            ),

        created:
            await readCell(
            cells,
            indexes.created
            )

        };


        defects.push(
        defect
        );


        /*
        * Mesmo padrão dos Issue Links.
        */

        console.log(
        `${defect.key} | ${defect.priority} | ${defect.status}`
        );

    }


    return defects;
    }


    /* =========================================================
    ASSINATURA DA TABELA
    =========================================================
    *
    * Usada para saber se a paginação
    * realmente mudou o conteúdo.
    */

    async function getTableSignature(
    table: Locator
    ): Promise<string> {

    const rows =
        table.locator(
        SELECTORS.dashboard.rows
        );


    const count =
        await rows.count();


    if (
        count === 0
    ) {

        return '';

    }


    const firstKey =
        (
        await rows
            .first()
            .getAttribute(
            'data-issuekey'
            )
        ) ?? '';


    const lastKey =
        (
        await rows
            .last()
            .getAttribute(
            'data-issuekey'
            )
        ) ?? '';


    return (
        `${count}|${firstKey}|${lastKey}`
    );
    }


    /* =========================================================
    PROCURA NEXT
    ========================================================= */

    async function findNextButton(
    content: Locator
    ): Promise<Locator | null> {

    const selectors = [

        'a[rel="next"]',

        'a.aui-nav-next',

        '.aui-nav-next a',

        'li.aui-nav-next a',

        'a[title*="Next"]',

        'button[title*="Next"]',

        'a[aria-label*="Next"]',

        'button[aria-label*="Next"]'

    ];


    for (
        const selector
        of selectors
    ) {

        const buttons =
        content.locator(
            selector
        );


        const total =
        await buttons.count();


        for (
        let i = 0;
        i < total;
        i++
        ) {

        const button =
            buttons.nth(i);


        const visible =
            await button
            .isVisible()
            .catch(
                () => false
            );


        if (!visible) {
            continue;
        }


        const ariaDisabled =
            await button
            .getAttribute(
                'aria-disabled'
            );


        const className =
            (
            await button
                .getAttribute(
                'class'
                )
            ) ?? '';


        const parentClass =
            (
            await button
                .locator(
                '..'
                )
                .getAttribute(
                'class'
                )
                .catch(
                () => ''
                )
            ) ?? '';


        const disabled =
            ariaDisabled === 'true' ||
            /disabled/i.test(
            className
            ) ||
            /disabled/i.test(
            parentClass
            );


        if (!disabled) {

            return button;

        }

        }

    }


    return null;
    }


    /* =========================================================
    PRÓXIMA PÁGINA
    ========================================================= */

    async function goToNextPage(
    page: Page,
    content: Locator,
    table: Locator
    ): Promise<boolean> {

    const next =
        await findNextButton(
        content
        );


    if (!next) {

        return false;

    }


    const previousSignature =
        await getTableSignature(
        table
        );


    await next.click();


    /*
    * Espera a issue-table mudar.
    */

    for (
        let attempt = 0;
        attempt < 40;
        attempt++
    ) {

        await page.waitForTimeout(
        300
        );


        const newTable =
        await findDefectsTable(
            content
        )
            .catch(
            () => null
            );


        if (!newTable) {

        continue;

        }


        const newSignature =
        await getTableSignature(
            newTable
        );


        if (
        newSignature &&
        newSignature !==
            previousSignature
        ) {

        return true;

        }

    }


    return false;
    }


    /* =========================================================
    EXTRAI TODAS AS PÁGINAS
    ========================================================= */

    async function extractAllDefects(
    page: Page,
    content: Locator
    ): Promise<DashboardDefect[]> {

    /*
    * Map evita duplicar a mesma issue.
    */

    const defects =
        new Map<
        string,
        DashboardDefect
        >();


    /*
    * Apenas proteção contra loop infinito.
    *
    * NÃO é limite de quantidade de defects.
    */

    const MAX_PAGES =
        100;


    for (
        let currentPage = 1;
        currentPage <= MAX_PAGES;
        currentPage++
    ) {

        const table =
        await findDefectsTable(
            content
        );


        const currentDefects =
        await extractCurrentPage(
            table
        );


        console.log(
        `Dashboard página ${currentPage}: ${currentDefects.length} defects`
        );


        for (
        const defect
        of currentDefects
        ) {

        defects.set(
            defect.key,
            defect
        );

        }


        const moved =
        await goToNextPage(
            page,
            content,
            table
        );


        if (!moved) {

        break;

        }

    }


    return Array.from(
        defects.values()
    );
    }


    /* =========================================================
    DASHBOARD
    ========================================================= */

    export async function extractDashboard(
    page: Page,
    pageId: string
    ): Promise<DashboardData> {

    const dashboardUrl =
        `${JIRA_URL}/secure/Dashboard.jspa?selectPageId=${encodeURIComponent(
        pageId
        )}`;


    console.log('\n');


    console.log(
        '========================================'
    );


    console.log(
        `Abrindo Dashboard ${pageId}`
    );


    console.log(
        '========================================'
    );


    /* =====================================================
        ABRE DASHBOARD
        ===================================================== */

    await page.goto(
        dashboardUrl,
        {
        waitUntil:
            'domcontentloaded',

        timeout:
            60000
        }
    );


    console.log(
        'Aguardando gadgets do Dashboard...'
    );


    /*
    * Pequena espera inicial para o Jira
    * começar a renderizar os gadgets.
    */

    await page.waitForTimeout(
        3000
    );


    /* =====================================================
        SCROLL LENTO ATÉ O FINAL
        ===================================================== */

    await slowScrollToBottom(
        page
    );


    /* =====================================================
        LOCALIZA O BLOCO CORRETO
        ===================================================== */

    const {
        content,
        rawTitle,
        title
    } =
        await findOpenDefectsGadget(
        page
        );


    /* =====================================================
        EXTRAI OS DEFECTS
        ===================================================== */

    const defects =
        await extractAllDefects(
        page,
        content
        );


    console.log(
        `✅ Total Dashboard: ${defects.length} defects`
    );


    /* =====================================================
        RESULTADO
        ===================================================== */

    return {

        pageId,

        rawTitle,

        title,

        total:
        defects.length,

        defects

    };
    }