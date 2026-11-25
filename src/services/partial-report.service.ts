import fs from 'node:fs';
import path from 'node:path';
import type {
  DashboardData,
  PositionDefinition,
  PositionReport,
  ReleaseLinks,
} from '../types/report.types';
import { TEST_TYPES } from '../config/test-types.config';
import { getConfiguredExecutions } from '../utils/position.utils';

export function parseReportArguments(args: string[]): { position?: string; list?: boolean } {
  if (!args.length) return {};
  if (args.length === 1 && args[0] === '--list-positions') return { list: true };
  if (args.length === 2 && args[0] === '--position' && args[1].trim()) {
    return { position: args[1].trim() };
  }
  throw new Error(
    'Use npm run report, npm run report -- --list-positions ou npm run report -- --position "Nome da posição".',
  );
}

export function selectPosition(configured: PositionDefinition[], name: string): PositionDefinition {
  const selected = configured.find(
    (position) => position.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
  );
  if (!selected)
    throw new Error(
      `Posição desconhecida: ${name}. Disponíveis: ${configured.map((position) => position.name).join(', ')}.`,
    );
  return selected;
}

export type PreviousReport = {
  extractionWarnings?: string[];
  positions: PositionReport[];
  dashboards: DashboardData[];
  releaseLinks: ReleaseLinks;
};

export function loadPreviousReport(
  fallbackLinks: ReleaseLinks,
  directory = path.join(process.cwd(), 'output'),
): PreviousReport {
  try {
    const saved = JSON.parse(fs.readFileSync(path.join(directory, 'report.json'), 'utf8'));
    if (!Array.isArray(saved.positions) || !saved.positions.length)
      throw new Error('Posições ausentes.');
    for (const position of saved.positions) {
      if (
        typeof position.position !== 'string' ||
        typeof position.testPlanPrit !== 'string' ||
        !Array.isArray(position.reports)
      )
        throw new Error('Posição inválida.');
      for (const report of position.reports) {
        if (
          typeof report.prit !== 'string' ||
          typeof report.title !== 'string' ||
          typeof report.mainStatus !== 'string' ||
          report.position !== position.position ||
          !Array.isArray(report.executionStatuses) ||
          !Array.isArray(report.issueLinks)
        )
          throw new Error('Execução inválida.');
      }
    }
    if (
      new Set(saved.positions.map((position: PositionReport) => position.position)).size !==
      saved.positions.length
    )
      throw new Error('Posições repetidas.');
    // Compatibilidade com relatórios gerados antes da atualização por posição.
    const dashboardPath = path.join(directory, 'dashboard.json');
    const rawDashboards =
      saved.dashboards ??
      (fs.existsSync(dashboardPath) ? JSON.parse(fs.readFileSync(dashboardPath, 'utf8')) : []);
    const dashboards: DashboardData[] = Array.isArray(rawDashboards)
      ? rawDashboards
      : [rawDashboards];
    if (
      dashboards.some(
        (dashboard) =>
          !dashboard || typeof dashboard.pageId !== 'string' || !Array.isArray(dashboard.defects),
      )
    )
      throw new Error('Dashboard inválido.');
    const releaseLinks: ReleaseLinks = saved.releaseLinks ?? {
      ...fallbackLinks,
      testPlans: fallbackLinks.testPlans.map((plan) => ({
        ...plan,
        title: saved.overall?.plans?.find(
          (item: { key: string; prit: string }) =>
            item.key === plan.position && item.prit === plan.prit,
        )?.title,
      })),
    };
    if (!Array.isArray(releaseLinks.testPlans)) throw new Error('Links inválidos.');
    return {
      positions: saved.positions,
      dashboards,
      releaseLinks,
      extractionWarnings: Array.isArray(saved.extractionWarnings)
        ? saved.extractionWarnings.filter((warning: unknown) => typeof warning === 'string')
        : [],
    };
  } catch (error) {
    throw new Error(
      'Não foi possível reutilizar output/report.json. Execute primeiro uma recolha completa com npm run report.',
      { cause: error },
    );
  }
}

export function definitionsFromReports(positions: PositionReport[]): PositionDefinition[] {
  return positions.map((position) => ({
    name: position.position,
    testPlanPrit: position.testPlanPrit,
    ...(position.testPlans
      ? { testPlans: position.testPlans }
      : {
          executions: Object.fromEntries(
            TEST_TYPES.map((type) => [
              type,
              position.reports
                .filter((report) => report.testType === type)
                .map((report) => report.prit),
            ]),
          ) as Record<(typeof TEST_TYPES)[number], string[]>,
        }),
  }));
}

export function validatePreviousPositions(
  previous: PositionReport[],
  configured: PositionDefinition[],
  selected: string,
): void {
  if (
    previous.length !== configured.length ||
    previous.some(
      (position) => !configured.some((definition) => definition.name === position.position),
    )
  ) {
    throw new Error('A lista de posições mudou. Execute uma recolha completa com npm run report.');
  }
  for (const definition of configured) {
    if (definition.name === selected) continue;
    const saved = previous.find((position) => position.position === definition.name);
    if (
      !saved ||
      saved.testPlanPrit !== (definition.testPlanPrit ?? '') ||
      JSON.stringify(saved.testPlans) !== JSON.stringify(definition.testPlans) ||
      (!definition.testPlanPrit &&
        JSON.stringify(getConfiguredExecutions([definition])) !==
          JSON.stringify(getConfiguredExecutions(definitionsFromReports([saved]))))
    ) {
      throw new Error(
        `A configuração de ${definition.name} mudou ou não tem dados guardados. Execute uma recolha completa com npm run report.`,
      );
    }
  }
}

export function mergePositionReports(
  previous: PositionReport[],
  updated: PositionReport[],
  configured: PositionDefinition[],
): PositionReport[] {
  return configured.map((definition) => {
    const position =
      updated.find((item) => item.position === definition.name) ??
      previous.find((item) => item.position === definition.name);
    if (!position) throw new Error(`Dados em falta para ${definition.name}.`);
    return position;
  });
}
