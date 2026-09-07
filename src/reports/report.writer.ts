    import fs
    from 'node:fs';

    import {
    PositionReport
    } from '../types/report.types';

    import {
    createTxtReport
    } from './txt.report';

    import {
    createHtmlReport
    } from './html.report';

    import {
    createEmailReport
    } from './email.report';


    export function writeReports(
    positions: PositionReport[]
    ): void {

    fs.mkdirSync(
        'output',
        {
        recursive:
            true
        }
    );


    /* JSON */

    fs.writeFileSync(

        'output/report.json',

        JSON.stringify(
        positions,
        null,
        2
        ),

        'utf-8'

    );


    /* TXT */

    fs.writeFileSync(

        'output/report.txt',

        createTxtReport(
        positions
        ),

        'utf-8'

    );


    /* HTML */

    fs.writeFileSync(

        'output/report.html',

        createHtmlReport(
        positions
        ),

        'utf-8'

    );


    /* EMAIL */

    fs.writeFileSync(

        'output/email.html',

        createEmailReport(
        positions
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

    console.log(
        'output/email.html'
    );

    }