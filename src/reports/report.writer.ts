    import {
    createEmailReport
    } from './email.report';   


    import fs
    from 'node:fs';

    import {
    Report
    } from '../types/report.types';

    import {
    createTxtReport
    } from './txt.report';

    import {
    createHtmlReport
    } from './html.report';


    export function writeReports(
    reports: Report[]
    ): void {

    fs.mkdirSync(
        'output',
        {
        recursive: true
        }
    );




    /*
    * JSON
    */

    fs.writeFileSync(
    'output/email.html',
    createEmailReport(reports),
    'utf-8'
    );

    fs.writeFileSync(

        'output/report.json',

        JSON.stringify(
        reports,
        null,
        2
        ),

        'utf-8'

    );


    /*
    * TXT
    */

    fs.writeFileSync(

        'output/report.txt',

        createTxtReport(
        reports
        ),

        'utf-8'

    );


    /*
    * HTML
    */

    fs.writeFileSync(

        'output/report.html',

        createHtmlReport(
        reports
        ),

        'utf-8'

    );


    console.log('\n');

    console.log(
        '✅ Relatórios gerados:'
    );

    console.log(
        'output/report.json'
    );

    console.log(
        'output/report.txt'
    );

    console.log(
        'output/report.html'
    );
    }