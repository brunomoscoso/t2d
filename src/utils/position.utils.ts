    /* =========================================================
    POSIÇÕES CONHECIDAS
    =========================================================
    *
    * name:
    * nome oficial que aparecerá no relatório.
    *
    * aliases:
    * maneiras diferentes pelas quais essa posição
    * pode aparecer no título.
    *
    * Sempre que encontrar qualquer alias,
    * retornamos o mesmo "name".
    */

    type PositionDefinition = {
    name: string;
    aliases: string[];
    };


    const POSITIONS: PositionDefinition[] = [

    {
        name: 'Arco do Cego',
        aliases: [
        'Arco do Cego',
        'Arco-do-Cego',
        'Arco_do_Cego',
        'ARCO DO CEGO'
        ]
    },

    {
        name: 'Olivais',
        aliases: [
        'Olivais',
        'OLIVAIS'
        ]
    },

    {
        name: 'Badajoz',
        aliases: [
        'Badajoz',
        'BADAJOZ'
        ]
    },

    {
        name: 'Las Rozas',
        aliases: [
        'Las Rozas',
        'Las-Rozas',
        'Las_Rozas'
        ]
    },

    {
        name: 'Tangerina',
        aliases: [
        'Tangerina'
        ]
    }

    ];


    /* =========================================================
    NORMALIZA TEXTO
    =========================================================
    *
    * Exemplos:
    *
    * "ARCO_DO_CEGO"
    * "Arco-do-Cego"
    * "Arco   do Cego"
    *
    * viram:
    *
    * "arco do cego"
    */

    function normalizeText(
    value: string
    ): string {

    return value

        /*
        * Remove acentos.
        *
        * Ex.:
        * POSIÇÃO → POSICAO
        */

        .normalize('NFD')

        .replace(
        /[\u0300-\u036f]/g,
        ''
        )

        /*
        * Tudo em minúsculo.
        */

        .toLowerCase()

        /*
        * "_" e "-" viram espaço.
        */

        .replace(
        /[_-]+/g,
        ' '
        )

        /*
        * Remove outros separadores.
        */

        .replace(
        /[\[\]():=|/\\]+/g,
        ' '
        )

        /*
        * Múltiplos espaços viram um.
        */

        .replace(
        /\s+/g,
        ' '
        )

        .trim();

    }


    /* =========================================================
    PROCURA POSIÇÃO CONHECIDA EM QUALQUER TEXTO
    ========================================================= */

    function findKnownPosition(
    value: string
    ): string | null {

    const normalizedValue =
        normalizeText(
        value
        );


    /*
    * Ordenamos pelas posições mais específicas primeiro.
    *
    * Isso evita um nome curto ganhar de um nome maior.
    */

    const definitions =
        [...POSITIONS]
        .sort(
            (a, b) => {

            const longestA =
                Math.max(
                ...a.aliases.map(
                    alias =>
                    normalizeText(alias).length
                )
                );


            const longestB =
                Math.max(
                ...b.aliases.map(
                    alias =>
                    normalizeText(alias).length
                )
                );


            return longestB - longestA;

            }
        );


    for (
        const position
        of definitions
    ) {

        for (
        const alias
        of position.aliases
        ) {

        const normalizedAlias =
            normalizeText(
            alias
            );


        if (
            normalizedValue.includes(
            normalizedAlias
            )
        ) {

            return position.name;

        }

        }

    }


    return null;

    }


    /* =========================================================
    POSIÇÃO PELO TÍTULO
    =========================================================
    *
    * Agora NÃO dependemos mais de colchetes.
    *
    * Procuramos o nome da posição
    * em qualquer lugar do título.
    */

    export function getPositionFromTitle(
    title: string
    ): string | null {

    return findKnownPosition(
        title
    );

    }


    /* =========================================================
    POSIÇÃO PELAS LABELS
    ========================================================= */

    export function getPositionFromLabels(
    labels: string[]
    ): string | null {

    /*
    * Primeiro procura qualquer posição conhecida
    * dentro das labels.
    */

    for (
        const label
        of labels
    ) {

        const knownPosition =
        findKnownPosition(
            label
        );


        if (
        knownPosition
        ) {

        return knownPosition;

        }

    }


    /*
    * Mantemos o comportamento que você já tinha
    * para labels do tipo:
    *
    * POSITION_TANGERINA
    * POSITION-TANGERINA
    * POSITION: TANGERINA
    * POSITION TANGERINA
    *
    * POSICAO_TANGERINA
    * POSIÇÃO_TANGERINA
    */

    const regex =
        /^(?:POSITION|POSICAO|POSIÇÃO)[_:\-\s=]+(.+)$/i;


    for (
        const label
        of labels
    ) {

        const match =
        label.match(
            regex
        );


        if (
        !match
        ) {

        continue;

        }


        const value =
        match[1]
            .replace(
            /_/g,
            ' '
            )
            .replace(
            /\s+/g,
            ' '
            )
            .trim();


        /*
        * Tenta transformar a label
        * no nome canônico.
        */

        const knownPosition =
        findKnownPosition(
            value
        );


        if (
        knownPosition
        ) {

        return knownPosition;

        }


        /*
        * Se não for uma posição cadastrada,
        * mantém o valor original da label.
        */

        return value;

    }


    return null;

    }


    /* =========================================================
    POSIÇÃO FINAL
    ========================================================= */

    export function getPosition(
    labels: string[],
    title: string
    ): string {

    /*
    * IMPORTANTE:
    *
    * Primeiro olhamos o título.
    *
    * Se o título possuir "Arco do Cego",
    * queremos "Arco do Cego", mesmo que
    * exista algo genérico como PT.
    */

    const fromTitle =
        getPositionFromTitle(
        title
        );


    if (
        fromTitle
    ) {

        return fromTitle;

    }


    /*
    * Depois usamos labels.
    */

    const fromLabels =
        getPositionFromLabels(
        labels
        );


    if (
        fromLabels
    ) {

        return fromLabels;

    }


    return 'SEM POSIÇÃO';

    }