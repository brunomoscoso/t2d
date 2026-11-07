import { POSITIONS } from '../config/positions.config';
import { TEST_TYPES } from '../config/test-types.config';
import type {
  ConfiguredExecution,
  PositionDefinition,
  PositionReport,
  ResolvedPositionDefinition,
} from '../types/report.types';
import { normalizePrit } from './prit.utils';

// Valida antes de qualquer acesso ao Jira; nunca deduplica a configuração.
export function resolvePositions(
  configured: PositionDefinition[] = POSITIONS,
): ResolvedPositionDefinition[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const owners = new Map<string, string>();
  const positions = configured.map((position) => {
    const name = position.name.trim();
    if (!name) errors.push('Posição sem nome.');
    if (names.has(name.toUpperCase())) errors.push(`Nome de posição repetido: ${name}.`);
    names.add(name.toUpperCase());
    const testPlanPrit = position.testPlanPrit?.trim() ? normalizePrit(position.testPlanPrit) : '';
    const executions: ResolvedPositionDefinition['executions'] = {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    };
    if (position.testPlans) {
      if (
        testPlanPrit ||
        Object.values(position.executions ?? {}).some((values) => values.length)
      ) {
        errors.push(`${name}: configure apenas os Test Plans por país, sem execuções.`);
      }
      return {
        name,
        testPlanPrit: '',
        executions,
        testPlans: {
          portugal: position.testPlans.portugal.trim()
            ? normalizePrit(position.testPlans.portugal)
            : '',
          espanha: position.testPlans.espanha.trim()
            ? normalizePrit(position.testPlans.espanha)
            : '',
        },
      };
    }
    for (const key of Object.keys(position.executions ?? {})) {
      if (!TEST_TYPES.includes(key as (typeof TEST_TYPES)[number])) {
        errors.push(`${name}: tipo de teste desconhecido: ${key}.`);
      }
    }
    for (const testType of TEST_TYPES) {
      const values = position.executions?.[testType];
      if (!Array.isArray(values)) {
        errors.push(`${name}/${testType}: configure um array de PRITs.`);
        continue;
      }
      executions[testType] = values.map((value) => {
        const prit = normalizePrit(value);
        const owner = `${name}/${testType}`;
        const previous = owners.get(prit);
        if (previous) errors.push(`${prit} repetido em ${previous} e ${owner}.`);
        else owners.set(prit, owner);
        return prit;
      });
    }
    return { name, testPlanPrit, executions };
  });
  for (const position of positions) {
    for (const prit of position.testPlans
      ? Object.values(position.testPlans)
      : [position.testPlanPrit]) {
      const owner = owners.get(prit);
      if (owner) {
        errors.push(`${prit}: Test Plan de ${position.name} usado como execução em ${owner}.`);
      }
    }
  }
  const sources = new Map(owners);
  for (const position of positions) {
    for (const [country, prit] of Object.entries(position.testPlans ?? {})) {
      if (!prit) continue;
      const previous = sources.get(prit);
      if (previous) errors.push(`${prit} repetido em ${previous} e ${position.name}/${country}.`);
      else sources.set(prit, `${position.name}/${country}`);
    }
  }
  if (errors.length)
    throw new Error(`Configuração de posições inválida:\n- ${errors.join('\n- ')}`);
  return positions.sort((a, b) => Number(!!a.testPlans) - Number(!!b.testPlans));
}

export function getConfiguredExecutions(
  configured: PositionDefinition[] = POSITIONS,
): ConfiguredExecution[] {
  return resolvePositions(configured).flatMap<ConfiguredExecution>((position) =>
    position.testPlans
      ? (['portugal', 'espanha'] as const).flatMap((testType) =>
          position.testPlans![testType]
            ? [{ prit: position.testPlans![testType], position: position.name, testType }]
            : [],
        )
      : TEST_TYPES.flatMap((testType) =>
          position.executions[testType].map((prit) => ({
            prit,
            position: position.name,
            testType,
          })),
        ),
  );
}

// As escolhas do editor também mudam quando o mesmo PRIT muda de posição/tipo.
export function getPositionReportKey(positions: PositionReport[]): string {
  return JSON.stringify(
    positions.map((position) => ({
      position: position.position,
      testPlanPrit: position.testPlanPrit,
      testPlans: position.testPlans,
      executions: position.reports.map((report) => [report.testType, report.prit]),
    })),
  );
}
