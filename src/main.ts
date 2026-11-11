import type { Page } from 'playwright';

import { DASHBOARD_PAGE_ID } from './config/positions.config';

import type {
  DashboardData,
  ExecutionData,
  PositionDefinition,
  TestType,
} from './types/report.types';

import { createBrowserSession } from './services/browser.service';

import { extractPrit } from './extractors/prit.extractor';

import { extractTestPlanExecutions } from './extractors/test-plan-executions.extractor';

import { extractDashboard } from './extractors/dashboard.extractor';

import { extractReleaseLinks } from './extractors/release-links.extractor';

import { groupReportsByPosition } from './utils/groupReports.utils';
import { getConfiguredExecutions, resolvePositions } from './utils/position.utils';
import { getConfiguredReleaseLinks } from './utils/release-links.utils';

import { writeReports } from './reports/report.writer';
import { TEST_TYPES } from './config/test-types.config';

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
        await page.waitForTimeout(2000 * attempt);
      }
    }
  }

  throw new Error(
    `Não foi possível extrair ${prit} após ${MAX_PRIT_ATTEMPTS} tentativas; o relatório não será gerado.`,
    { cause: lastError },
  );
}

async function main() {
  const configuredPositions = resolvePositions();
  const planPositions = configuredPositions.filter(
    (position) => !position.testPlans && position.testPlanPrit,
  );
  const configuredExecutions = getConfiguredExecutions(configuredPositions);
  const firstPrit = planPositions[0]?.testPlanPrit ?? configuredExecutions[0]?.prit;
  if (!firstPrit) {
    throw new Error(
      'Nenhum Test Plan ou PRIT de execução configurado em POSITIONS (positions.config.ts). Nenhum relatório novo foi gerado.',
    );
  }

  if (!DASHBOARD_PAGE_ID) {
    throw new Error('Nenhum Dashboard configurado.');
  }

  const { browser, page } = await createBrowserSession(firstPrit);

  try {
    const executionsByPlan = new Map<string, Record<TestType, string[]>>();
    for (const position of planPositions) {
      const discovered = await extractTestPlanExecutions(page, position.testPlanPrit);
      const executions: Record<TestType, string[]> = {
        smoke: [],
        regression: [],
        certification: [],
        defectFixing: [],
      };
      for (const execution of discovered) {
        executions[execution.testType].push(execution.prit);
        console.log(
          `✅ Execução descoberta: ${execution.prit} | ${execution.title} → ${position.name} / ${execution.testType}`,
        );
      }
      executionsByPlan.set(position.name, executions);
    }

    const dynamicPositions: PositionDefinition[] = configuredPositions.map((position) => {
      const discovered = executionsByPlan.get(position.name);
      return discovered ? { ...position, executions: discovered } : position;
    });
    const executions = getConfiguredExecutions(dynamicPositions);
    if (executions.length === 0) {
      throw new Error(
        'Nenhuma execução foi encontrada nos Test Plans configurados. Nenhum relatório novo foi gerado.',
      );
    }

    const reports: ExecutionData[] = [];

    // A falha num PRIT interrompe a coleta para evitar um relatório parcial.
    for (const execution of executions) {
      const report = await extractPritWithRetry(page, execution.prit);
      reports.push(report);
      console.log(`✅ ${execution.prit} → ${execution.position} / ${execution.testType}`);
    }

    const positions = groupReportsByPosition(reports, dynamicPositions);

    // Os links enriquecem os títulos; os planos por país também são fontes da coleta de Automação.
    const releaseLinks = await extractReleaseLinks(
      page.request,
      getConfiguredReleaseLinks(configuredPositions),
    );

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

    writeReports(positions, dashboard, releaseLinks, dynamicPositions);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error('❌ Erro fatal na execução:');
  console.error(error);
  process.exit(1);
});
