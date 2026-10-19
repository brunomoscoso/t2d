import { POSITIONS } from '../config/positions.config';
import { TEST_TYPES, TEST_TYPE_LABELS } from '../config/test-types.config';
import type {
  PositionDefinition,
  PositionReport,
  TestPlanLink,
  TestType,
} from '../types/report.types';
import { normalizeStatus } from './html.utils';
import { groupReportsByPosition } from './groupReports.utils';
import { resolvePositions } from './position.utils';

export type OverallTypeResults = {
  testType: TestType;
  counts: Record<string, number>;
  total: number;
  executions: number;
  available: boolean;
};
export type OverallPlanResults = {
  key: string;
  prit: string;
  label: string;
  title: string;
  statuses: string[];
  types: OverallTypeResults[];
  warnings: string[];
};
export type OverallResults = { plans: OverallPlanResults[] };

const standardStatuses = [
  'PASS',
  'TODO',
  'EXECUTING',
  'FAIL',
  'ABORTED',
  'BLOCKED',
  'FOR_TESTING',
  'PENDING_3RD',
];

// O denominador é a soma dos status da mesma posição e tipo, nunca uma média.
export function overallPercentage(count: number, total: number): string {
  return `${total ? ((count * 100) / total).toFixed(1).replace(/\.0$/, '') : '0'}%`;
}

export function aggregateOverallResults(
  positions: PositionReport[],
  links: TestPlanLink[] = [],
  configured: PositionDefinition[] = POSITIONS,
): OverallResults {
  const definitions = resolvePositions(configured);
  // Reaplica a configuração e rejeita dados repetidos ou fora do escopo.
  const grouped = groupReportsByPosition(
    positions.flatMap((position) => position.reports),
    definitions,
  );
  const reports = new Map(
    grouped.flatMap((position) => position.reports).map((report) => [report.prit, report]),
  );
  const plans = definitions.map((position): OverallPlanResults => {
    const warnings: string[] = [];
    const statuses = new Set(standardStatuses);
    if (!position.testPlanPrit) warnings.push('Test Plan da posição ainda não configurado.');
    const types = TEST_TYPES.map((testType): OverallTypeResults => {
      const result: OverallTypeResults = {
        testType,
        counts: Object.create(null),
        total: 0,
        executions: 0,
        available: true,
      };
      const expected = position.executions[testType];
      const missing = expected.filter((prit) => !reports.has(prit));
      if (missing.length) {
        result.available = false;
        warnings.push(
          `${TEST_TYPE_LABELS[testType]}: execuções não coletadas (${missing.join(', ')}); agregado indisponível para evitar resultados parciais.`,
        );
        return result;
      }
      for (const prit of expected) {
        const report = reports.get(prit)!;
        result.executions++;
        let executionTotal = 0;
        for (const item of report.executionStatuses) {
          const normalized = normalizeStatus(item.status);
          const status = normalized === 'TO_DO' ? 'TODO' : normalized;
          if (!status || !Number.isSafeInteger(item.quantidade) || item.quantidade < 0) {
            warnings.push(`${prit}: status ou quantidade inválida; valor excluído do Overall.`);
            continue;
          }
          statuses.add(status);
          result.counts[status] = (result.counts[status] ?? 0) + item.quantidade;
          executionTotal += item.quantidade;
        }
        result.total += executionTotal;
        if (!report.executionStatuses.length && report.totalTests !== 0) {
          result.available = false;
          warnings.push(
            `${prit}: status de execução não coletados; agregado de ${TEST_TYPE_LABELS[testType]} indisponível.`,
          );
        } else if (report.totalTests !== null && report.totalTests !== executionTotal) {
          warnings.push(
            `${prit}: soma dos status (${executionTotal}) difere do total informado (${report.totalTests}); percentuais calculados sobre os status coletados.`,
          );
        }
      }
      return result;
    });
    // Metadados do Jira só enriquecem a exibição; não podem alterar o plano configurado.
    const title = links.find(
      (link) => link.position === position.name && link.prit === position.testPlanPrit,
    )?.title;
    return {
      key: position.name,
      prit: position.testPlanPrit,
      label: position.name,
      title: title?.trim() || position.name,
      statuses: [
        ...standardStatuses,
        ...[...statuses].filter((status) => !standardStatuses.includes(status)).sort(),
      ],
      types,
      warnings,
    };
  });
  return { plans };
}
