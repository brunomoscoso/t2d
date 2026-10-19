import { POSITIONS } from '../config/positions.config';
import { TEST_TYPES } from '../config/test-types.config';
import type {
  ConfiguredExecution,
  PositionDefinition,
  PositionReport,
} from '../types/report.types';
import { normalizePrit } from './prit.utils';

// Valida antes de qualquer acesso ao Jira; nunca deduplica a configuração.
export function resolvePositions(
  configured: PositionDefinition[] = POSITIONS,
): PositionDefinition[] {
  const errors: string[] = [];
  const names = new Set<string>();
  const owners = new Map<string, string>();
  const positions = configured.map((position) => {
    const name = position.name.trim();
    if (!name) errors.push('Posição sem nome.');
    if (names.has(name.toUpperCase())) errors.push(`Nome de posição repetido: ${name}.`);
    names.add(name.toUpperCase());
    const testPlanPrit = position.testPlanPrit.trim()
      ? normalizePrit(position.testPlanPrit)
      : '';
    const executions: PositionDefinition['executions'] = {
      smoke: [],
      regression: [],
      certification: [],
      defectFixing: [],
    };
    for (const key of Object.keys(position.executions)) {
      if (!TEST_TYPES.includes(key as (typeof TEST_TYPES)[number])) {
        errors.push(`${name}: tipo de teste desconhecido: ${key}.`);
      }
    }
    for (const testType of TEST_TYPES) {
      const values = position.executions[testType];
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
    if (!testPlanPrit && TEST_TYPES.some((type) => executions[type].length)) {
      errors.push(`${name}: informe o Test Plan antes de configurar execuções.`);
    }
    return { name, testPlanPrit, executions };
  });
  for (const position of positions) {
    const owner = owners.get(position.testPlanPrit);
    if (owner) {
      errors.push(
        `${position.testPlanPrit}: Test Plan de ${position.name} usado como execução em ${owner}.`,
      );
    }
  }
  if (errors.length) throw new Error(`Configuração de posições inválida:\n- ${errors.join('\n- ')}`);
  return positions;
}

export function getConfiguredExecutions(
  configured: PositionDefinition[] = POSITIONS,
): ConfiguredExecution[] {
  return resolvePositions(configured).flatMap((position) =>
    TEST_TYPES.flatMap((testType) =>
      position.executions[testType].map((prit) => ({ prit, position: position.name, testType })),
    ),
  );
}

// As escolhas do editor também mudam quando o mesmo PRIT muda de posição/tipo.
export function getPositionReportKey(positions: PositionReport[]): string {
  return JSON.stringify(
    positions.map((position) => ({
      position: position.position,
      testPlanPrit: position.testPlanPrit,
      executions: position.reports.map((report) => [report.testType, report.prit]),
    })),
  );
}
