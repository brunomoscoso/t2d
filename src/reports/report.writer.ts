import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { aggregateOverallResults } from '../utils/overall-results.utils';

import {
  DashboardData,
  PositionDefinition,
  ReleaseLinks,
  PositionReport,
} from '../types/report.types';

import { createTxtReport } from './txt.report';

import { createHtmlReport } from './html.report';

import { createEmailReport } from './email.report';

import { createDashboardEmailHtml, createDashboardHtml } from './dashboard.report';

/* =========================================================
    INJECT BEFORE BODY END
    ========================================================= */

function injectBeforeBodyEnd(html: string, content: string): string {
  const bodyEnd = html.toLowerCase().lastIndexOf('</body>');

  if (bodyEnd === -1) {
    return html + content;
  }

  return html.slice(0, bodyEnd) + content + html.slice(bodyEnd);
}

/* =========================================================
    DASHBOARD NO EMAIL
    ========================================================= */

function injectDashboardIntoEmail(emailHtml: string, dashboardHtml: string): string {
  /*
   * Se existir o marcador no template,
   * usamos exatamente aquela posição.
   */

  if (emailHtml.includes('<!-- DASHBOARD -->')) {
    return emailHtml.replace('<!-- DASHBOARD -->', dashboardHtml);
  }

  /*
   * Fallback:
   * adiciona antes do </body>.
   */

  return injectBeforeBodyEnd(emailHtml, dashboardHtml);
}

/* =========================================================
    WRITE REPORTS
    =========================================================
    *
    * dashboard é opcional.
    *
    * Portanto:
    *
    * writeReports(positions)
    *
    * continua funcionando.
    */

export function writeReports(
  positions: PositionReport[],
  dashboard?: DashboardData,
  releaseLinks?: ReleaseLinks,
  configured?: PositionDefinition[],
): string {
  const overall = aggregateOverallResults(positions, releaseLinks?.testPlans, configured);
  for (const warning of new Set(
    overall.plans.flatMap((plan) => plan.warnings.map((warning) => `${plan.label}: ${warning}`)),
  )) {
    console.warn(`⚠️ ${warning}`);
  }

  const outputDirectory = path.join(process.cwd(), 'output');

  fs.mkdirSync(outputDirectory, {
    recursive: true,
  });

  /* =====================================================
        REPORT JSON
        ===================================================== */

  fs.writeFileSync(
    path.join(outputDirectory, 'report.json'),

    JSON.stringify({ positions, overall }, null, 2),

    'utf-8',
  );

  /* =====================================================
        TXT
        ===================================================== */

  fs.writeFileSync(
    path.join(outputDirectory, 'report.txt'),

    createTxtReport(positions),

    'utf-8',
  );

  /* =====================================================
        HTML ORIGINAL
        ===================================================== */

  let reportHtml = createHtmlReport(positions, releaseLinks, overall);

  /* =====================================================
        EMAIL ORIGINAL
        ===================================================== */

  let emailHtml = createEmailReport(positions, releaseLinks, overall);

  /* =====================================================
        DASHBOARD
        ===================================================== */

  if (dashboard) {
    /*
     * JSON separado para debug.
     */

    fs.writeFileSync(
      path.join(outputDirectory, 'dashboard.json'),

      JSON.stringify(dashboard, null, 2),

      'utf-8',
    );

    /*
     * Dashboard por último no report.html.
     */

    reportHtml = injectBeforeBodyEnd(
      reportHtml,

      createDashboardHtml(dashboard),
    );

    /*
     * Dashboard após os defects criados na sprint, conforme o template.
     */

    emailHtml = injectDashboardIntoEmail(
      emailHtml,

      createDashboardEmailHtml(dashboard),
    );
  }

  /* =====================================================
        SALVA HTML
        ===================================================== */

  fs.writeFileSync(
    path.join(outputDirectory, 'report.html'),

    reportHtml,

    'utf-8',
  );

  /* =====================================================
        SALVA EMAIL
        ===================================================== */

  const emailPath = path.join(outputDirectory, 'email.html');

  fs.writeFileSync(
    emailPath,

    emailHtml,

    'utf-8',
  );

  /* =====================================================
        LOG
        ===================================================== */

  console.log('\n');

  console.log('✅ Relatórios gerados:');

  console.log(path.join(outputDirectory, 'report.json'));

  console.log(path.join(outputDirectory, 'report.txt'));

  console.log(path.join(outputDirectory, 'report.html'));

  console.log(emailPath);

  if (dashboard) {
    console.log(path.join(outputDirectory, 'dashboard.json'));
  }

  return emailPath;
}

export function openEmailReport(emailPath: string): void {
  const url = pathToFileURL(path.resolve(emailPath)).href;
  const command =
    process.platform === 'win32'
      ? 'rundll32.exe'
      : process.platform === 'darwin'
        ? 'open'
        : 'xdg-open';
  const args = process.platform === 'win32' ? ['url.dll,FileProtocolHandler', url] : [url];
  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  });
  child.on('error', (error) => {
    console.warn(`⚠️ Não foi possível abrir o relatório no navegador: ${error.message}`);
  });
  child.unref();
  console.log(`✅ Relatório aberto no navegador: ${emailPath}`);
}
