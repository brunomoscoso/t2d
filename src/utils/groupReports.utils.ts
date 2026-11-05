import { POSITIONS } from '../config/positions.config';
import { TEST_TYPES } from '../config/test-types.config';
import type {
  ExecutionData,
  PositionDefinition,
  PositionReport,
  Report,
} from '../types/report.types';
import { getConfiguredExecutions, resolvePositions } from './position.utils';
import { normalizePrit } from './prit.utils';

// Atualiza a nomenclatura nos relatórios; a associação continua a vir de POSITIONS.
function currentPositionNames(text: string): string {
  return text.replace(/\bPontes\b/gi, 'Reseller');
}

export function groupReportsByPosition(
  reports: ExecutionData[],
  configured: PositionDefinition[] = POSITIONS,
): PositionReport[] {
  const positions = resolvePositions(configured);
  const assignments = new Map(getConfiguredExecutions(positions).map((item) => [item.prit, item]));
  const collected = new Map<string, Report>();
  for (const report of reports) {
    const prit = normalizePrit(report.prit);
    const assignment = assignments.get(prit);
    if (!assignment) throw new Error(`${prit}: execução coletada sem posição/tipo configurados.`);
    if (collected.has(prit)) throw new Error(`${prit}: execução repetida nos dados coletados.`);
    collected.set(prit, {
      ...report,
      ...assignment,
      title: currentPositionNames(report.title),
      issueLinks: report.issueLinks.map((issue) => ({
        ...issue,
        titulo: currentPositionNames(issue.titulo),
      })),
    });
  }
  return positions.map((position) => ({
    position: position.name,
    testPlanPrit: position.testPlanPrit,
    ...(position.testPlans ? { testPlans: position.testPlans } : {}),
    reports: getConfiguredExecutions([position]).flatMap(({ prit }) => {
      const report = collected.get(prit);
      return report ? [report] : [];
    }),
  }));
}

export function groupReportsByTestType(position: PositionReport) {
  const groups = position.testPlans ? (['portugal', 'espanha'] as const) : TEST_TYPES;
  return groups.map((testType) => ({
    testType,
    reports: position.reports.filter((report) => report.testType === testType),
  }));
}
