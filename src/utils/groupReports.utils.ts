    import { DEFAULT_POSITION, POSITIONS } from '../config/positions.config';

    import {
    PositionReport,
    Report
    } from '../types/report.types';

    // Prioridade de exibição dentro de cada posição, pelo título da execução.
    const EXECUTION_ORDER = [
        /\b(?:smokes?|somokes?)\b/i,
        /\bcertification\b/i,
        /\bregressions?\b|\bregressio\b/i
    ];

    function getExecutionOrder(title: string): number {
        const normalizedTitle = title.replace(/[_-]+/g, ' ');
        const order = EXECUTION_ORDER.findIndex(pattern => pattern.test(normalizedTitle));

        return order === -1 ? EXECUTION_ORDER.length : order;
    }


    export function groupReportsByPosition(
    reports: Report[]
    ): PositionReport[] {

    const positionOrder = new Map(
        POSITIONS.map((position, index) => [position.name, index])
    );

    const getOrder = (position: string): number => {
        if (position === DEFAULT_POSITION) {
            return POSITIONS.length + 1;
        }

        // Posições não cadastradas ficam depois da cola e antes de Exploratory Testing.
        return positionOrder.get(position) ?? POSITIONS.length;
    };

    const groups =
        new Map<
        string,
        Report[]
        >();


    for (
        const report
        of reports
    ) {

        const currentReports =
        groups.get(
            report.position
        ) ?? [];


        currentReports.push(
        report
        );


        groups.set(
        report.position,
        currentReports
        );

    }


    return Array
        .from(
        groups.entries()
        )
        .map(
        ([
            position,
            groupedReports
        ]) => ({

            position,

            reports:
            groupedReports.sort((a, b) =>
                getExecutionOrder(a.title) - getExecutionOrder(b.title)
            )

        })
        )
        .sort((a, b) => getOrder(a.position) - getOrder(b.position));

    }
