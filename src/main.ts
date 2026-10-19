import type { Page } from 'playwright';

import { DASHBOARD_PAGE_ID } from './config/positions.config';

import type { DashboardData, ExecutionData } from './types/report.types';

import { createBrowserSession } from './services/browser.service';

import { extractPrit } from './extractors/prit.extractor';

import { extractDashboard } from './extractors/dashboard.extractor';

import { extractReleaseLinks } from './extractors/release-links.extractor';

import { groupReportsByPosition } from './utils/groupReports.utils';
import { getConfiguredExecutions } from './utils/position.utils';

import { writeReports } from './reports/report.writer';

const MAX_PRIT_ATTEMPTS = 3;

// Repete a coleta completa quando a página ainda não disponibilizou os dados esperados.
async function extractPritWithRetry(page: Page, prit: string): Promise<ExecutionData> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_PRIT_ATTEMPTS; attempt++) {
    try {
      return await extractPrit(page, prit);
    } catch (error) {
      lastError = error;
      console.error(
        `⚠️ Falha ao extrair ${prit} (tentativa ${attempt}/${MAX_PRIT_ATTEMPTS}).`,
        error,
      );

      if (attempt < MAX_PRIT_ATTEMPTS) {
        await page.waitForTimeout(1000 * attempt);
      }
    }
  }

  throw new Error(
    `Não foi possível extrair ${prit} após ${MAX_PRIT_ATTEMPTS} tentativas; o relatório não será gerado.`,
    { cause: lastError },
  );
}

async function main() {
  const executions = getConfiguredExecutions();
  if (executions.length === 0) {
    throw new Error(
      'Nenhuma execução atribuída a posição/tipo. Preencha os arrays de execuções em POSITIONS (positions.config.ts) antes da coleta. Nenhum relatório novo foi gerado.',
    );
  }

  if (!DASHBOARD_PAGE_ID) {
    throw new Error('Nenhum Dashboard configurado.');
  }

  const { browser, page } = await createBrowserSession(executions[0].prit);

  try {
    const reports: ExecutionData[] = [];

    // A falha num PRIT interrompe a coleta para evitar um relatório parcial.
    for (const execution of executions) {
      const report = await extractPritWithRetry(page, execution.prit);
      reports.push(report);
      console.log(`✅ ${execution.prit} → ${execution.position} / ${execution.testType}`);
    }

    const positions = groupReportsByPosition(reports);

    // Os Test Plans fornecem apenas títulos/links; não definem o escopo da coleta.
    const releaseLinks = await extractReleaseLinks(page.request);

    // O dashboard é complementar: se falhar, os relatórios dos PRITs continuam disponíveis.
    let dashboard: DashboardData | undefined;
    const dashboardPage = await page.context().newPage();

    try {
      dashboard = await extractDashboard(dashboardPage, DASHBOARD_PAGE_ID);
      console.log(`✅ Dashboard ${DASHBOARD_PAGE_ID} extraído`);
    } catch (error) {
      console.error('❌ Não foi possível extrair o Dashboard.');
      console.error(error);
    } finally {
      await dashboardPage.close();
    }

    writeReports(positions, dashboard, releaseLinks);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Erro fatal na execução:');
  console.error(error);
  process.exit(1);
});
