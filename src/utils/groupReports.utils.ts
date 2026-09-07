    import {
    PositionReport,
    Report
    } from '../types/report.types';


    export function groupReportsByPosition(
    reports: Report[]
    ): PositionReport[] {

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
            groupedReports

        })
        );

    }