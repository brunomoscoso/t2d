    export function getPositionFromLabels(
    labels: string[]
    ): string | null {

    /*
    * Exemplos aceitos:
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
        const label of labels
    ) {

        const match =
        label.match(regex);

        if (!match) {
        continue;
        }

        return match[1]
        .replace(/_/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return null;
    }


    export function getPositionFromTitle(
    title: string
    ): string | null {

    /*
    * Exemplo de título:
    * [Passport X v5.3.0.37] - [Pre-PRD PT] [Arco do Cego] Regression Group 1
    *
    * Queremos extrair:
    * Arco do Cego
    */

    const matches =
        [...title.matchAll(/\[([^\]]+)\]/g)]
        .map(match => match[1].trim())
        .filter(Boolean);

    if (matches.length === 0) {
        return null;
    }

    /*
    * Removemos blocos que claramente não são posição.
    */
    const ignoredPatterns = [
        /passport/i,
        /pre-?prod/i,
        /pre-?prd/i,
        /\bpt\b/i,
        /\bsp\b/i,
        /regression/i,
        /smoke/i,
        /installation/i,
        /group/i,
        /v\d+/i
    ];

    const possiblePositions =
        matches.filter(item =>
        !ignoredPatterns.some(pattern => pattern.test(item))
        );

    /*
    * Se encontrou candidatos, usa o último.
    * Ex.: [Passport X ...] [Pre-PRD PT] [Arco do Cego]
    * => Arco do Cego
    */
    if (possiblePositions.length > 0) {
        return possiblePositions[
        possiblePositions.length - 1
        ];
    }

    /*
    * Fallback: em muitos casos a posição é o último bloco entre colchetes.
    */
    return matches[matches.length - 1] ?? null;
    }


    export function getPosition(
    labels: string[],
    title: string
    ): string {

    const fromLabels =
        getPositionFromLabels(labels);

    if (fromLabels) {
        return fromLabels;
    }

    const fromTitle =
        getPositionFromTitle(title);

    if (fromTitle) {
        return fromTitle;
    }

    return 'SEM POSIÇÃO';
    }