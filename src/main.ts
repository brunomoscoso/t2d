import type { Page } from 'playwright';
import { setTimeout as delay } from 'node:timers/promises';

import { DASHBOARD_PAGE_IDS } from './config/positions.config';

import type {
  DashboardData,
  ExecutionData,
  PositionDefinition,
  TestType,
} from './types/report.types';

import { createBrowserSession } from './services/browser.service';

import { extractPrit } from './extractors/prit.extractor';
import { collectWithPages } from './services/execution-pool.service';
import { unavailableExecution } from './services/partial-extraction.service';

import { extractTestPlanExecutions } from './extractors/test-plan-executions.extractor';

import { extractDashboard } from './extractors/dashboard.extractor';

import { extractReleaseLinks } from './extractors/release-links.extractor';

import { groupReportsByPosition } from './utils/groupReports.utils';
import { getConfiguredExecutions, resolvePositions } from './utils/position.utils';
import { getConfiguredReleaseLinks } from './utils/release-links.utils';

import { openEmailReport, writeReports } from './reports/report.writer';
import {
  definitionsFromReports,
  loadPreviousReport,
  mergePositionReports,
  parseReportArguments,
  selectPosition,
  validatePreviousPositions,
} from './services/partial-report.service';

const MAX_PRIT_ATTEMPTS = 3;

// Repete a coleta completa quando a página ainda não disponibilizou os dados esperados.
async function extractPritWithRetry(page: Page, prit: string): Promise<ExecutionData> {
  let lastError: unknown;
  let partial: ExecutionData | undefined;

  for (let attempt = 1; attempt <= MAX_PRIT_ATTEMPTS; attempt++) {
    try {
      partial = await extractPrit(page, prit);
      if (!partial.extractionWarnings?.length) return partial;
      lastError = new Error('Alguns campos não foram extraídos ou confirmados.');
    } catch (error) {
      lastError = error;
      console.error(
        `⚠️ Falha ao extrair ${prit} (tentativa ${attempt}/${MAX_PRIT_ATTEMPTS}).`,
        error,
      );

      if (attempt < MAX_PRIT_ATTEMPTS) {
        await delay(2000 * attempt);
      }
    }
  }

  return (
    partial ??
    unavailableExecution(
      prit,
      `Falha após ${MAX_PRIT_ATTEMPTS} tentativas: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    )
  );
}

async function main() {
  const configuredPositions = resolvePositions();
  const options = parseReportArguments(process.argv.slice(2));
  if (options.list) {
    console.log(configuredPositions.map((position) => position.name).join('\n'));
    return;
  }
  const selected = options.position
    ? selectPosition(configuredPositions, options.position)
    : undefined;
  const previous = selected
    ? loadPreviousReport(getConfiguredReleaseLinks(configuredPositions))
    : undefined;
  if (previous && selected) {
    validatePreviousPositions(previous.positions, configuredPositions, selected.name);
    console.log(
      `A atualizar apenas ${selected.name}. Restantes posições e dashboards: dados da extração anterior.`,
    );
  }
  const positionsToExtract = selected ? resolvePositions([selected]) : configuredPositions;
  const planPositions = positionsToExtract.filter(
    (position) => !position.testPlans && position.testPlanPrit,
  );
  const configuredExecutions = getConfiguredExecutions(positionsToExtract);
  const firstPrit = planPositions[0]?.testPlanPrit ?? configuredExecutions[0]?.prit;
  if (!firstPrit) {
    throw new Error(
      `${selected ? selected.name + ': ' : ''}Nenhum Test Plan ou PRIT de execução configurado em POSITIONS (positions.config.ts). Nenhum relatório novo foi gerado.`,
    );
  }

  const dashboardIds = [...new Set(DASHBOARD_PAGE_IDS.map((id) => id.trim()).filter(Boolean))];
  if (!previous && dashboardIds.length === 0) {
    throw new Error('Nenhum Dashboard configurado.');
  }

  let session;
  try {
    session = await createBrowserSession(firstPrit);
  } catch (error) {
    const message = `Recolha não iniciada: ${error instanceof Error ? error.message : String(error)}`;
    const unavailable = groupReportsByPosition(
      getConfiguredExecutions(positionsToExtract).map((execution) =>
        unavailableExecution(execution.prit, message),
      ),
      positionsToExtract,
    );
    for (const position of unavailable) position.extractionWarnings = [message];
    const positions = previous
      ? mergePositionReports(previous.positions, unavailable, configuredPositions)
      : unavailable;
    const email = writeReports(
      positions,
      previous?.dashboards ?? [],
      previous?.releaseLinks ?? getConfiguredReleaseLinks(configuredPositions),
      definitionsFromReports(positions),
      [...(previous?.extractionWarnings ?? []), message],
    );
    openEmailReport(email);
    return;
  }
  const { browser, page } = session;
  let generatedEmailPath: string | undefined;
  const discoveryWarnings = new Map<string, string[]>();
  const runWarnings: string[] = previous?.extractionWarnings ?? [];

  try {
    const executionsByPlan = new Map<string, Record<TestType, string[]>>();
    for (const position of planPositions) {
      let discovered;
      try {
        discovered = await extractTestPlanExecutions(page, position.testPlanPrit);
      } catch (error) {
        discoveryWarnings.set(position.name, [
          `${position.testPlanPrit}: execuções não descobertas. ${error instanceof Error ? error.message : String(error)}`,
        ]);
        continue;
      }
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

    const dynamicPositions: PositionDefinition[] = positionsToExtract.map((position) => {
      const discovered = executionsByPlan.get(position.name);
      return discovered ? { ...position, executions: discovered } : position;
    });
    const executions = getConfiguredExecutions(dynamicPositions);
    if (executions.length === 0 && !discoveryWarnings.size) {
      throw new Error(
        'Nenhuma execução foi encontrada nos Test Plans configurados. Nenhum relatório novo foi gerado.',
      );
    }

    const started = performance.now();
    const reports = await collectWithPages(
      page.context(),
      executions,
      async (workerPage, execution) => {
        const report = await extractPritWithRetry(workerPage, execution.prit);
        console.log(
          `${report.extractionWarnings?.length ? '⚠️ Parcial' : '✅'} ${execution.prit} → ${execution.position} / ${execution.testType}`,
        );
        return report;
      },
      2,
      (execution, error) =>
        unavailableExecution(
          execution.prit,
          `Página de recolha indisponível: ${error instanceof Error ? error.message : String(error)}`,
        ),
    );
    console.log(
      `Recolha de ${reports.length} PRITs em ${((performance.now() - started) / 1000).toFixed(1)} s (até 2 páginas).`,
    );

    const extractedPositions = groupReportsByPosition(reports, dynamicPositions);
    for (const position of extractedPositions)
      position.extractionWarnings = discoveryWarnings.get(position.position);
    const positions = previous
      ? mergePositionReports(previous.positions, extractedPositions, configuredPositions)
      : extractedPositions;

    // Os links enriquecem os títulos; os planos por país também são fontes da coleta de Automação.
    const linksToExtract = getConfiguredReleaseLinks(positionsToExtract);
    if (previous) linksToExtract.dashboards = [];
    const extractedLinks = await extractReleaseLinks(page.request, linksToExtract);
    const releaseLinks =
      previous && selected
        ? {
            ...previous.releaseLinks,
            testPlans: configuredPositions.flatMap((position) =>
              (position.name === selected.name
                ? extractedLinks
                : previous.releaseLinks
              ).testPlans.filter((plan) => plan.position === position.name),
            ),
          }
        : extractedLinks;

    // O dashboard é complementar: se falhar, os relatórios dos PRITs continuam disponíveis.
    const dashboards: DashboardData[] = previous ? previous.dashboards : [];
    if (!previous) {
      let dashboardPage: Page | undefined;
      try {
        dashboardPage = await page.context().newPage();
        for (const dashboardId of dashboardIds) {
          try {
            dashboards.push(await extractDashboard(dashboardPage, dashboardId));
            console.log(`✅ Dashboard ${dashboardId} extraído`);
          } catch (error) {
            console.error(`❌ Não foi possível extrair o Dashboard ${dashboardId}.`, error);
            runWarnings.push(
              `Dashboard ${dashboardId}: não extraído. ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }
      } catch (error) {
        runWarnings.push(
          `Dashboards ${dashboardIds.join(', ')} não extraídos: ${error instanceof Error ? error.message : String(error)}`,
        );
      } finally {
        await dashboardPage?.close().catch(() => {});
      }
    }

    generatedEmailPath = writeReports(
      positions,
      dashboards,
      releaseLinks,
      previous ? definitionsFromReports(positions) : dynamicPositions,
      runWarnings,
    );
  } finally {
    await browser.close().catch(() => {});
  }

  if (generatedEmailPath) openEmailReport(generatedEmailPath);
}

main().catch((error: unknown) => {
  console.error('❌ Erro fatal na execução:');
  console.error(error);
  process.exit(1);
});
