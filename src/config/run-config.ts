import type { PositionDefinition } from '../types/report.types';

export type RunConfig = { dashboardPageId: string; positions: PositionDefinition[] };

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function parseRunConfig(json: string): RunConfig {
  if (Buffer.byteLength(json, 'utf8') > 60000) throw new Error('Configuração excede 60 KB.');
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    throw new Error('Configuração JSON inválida.');
  }
  if (
    !record(value) ||
    typeof value.dashboardPageId !== 'string' ||
    !/^\d+$/.test(value.dashboardPageId)
  ) {
    throw new Error('dashboardPageId deve ser uma string numérica.');
  }
  if (!Array.isArray(value.positions) || !value.positions.length || value.positions.length > 100) {
    throw new Error('Configure entre 1 e 100 posições.');
  }
  for (const position of value.positions) {
    if (
      !record(position) ||
      typeof position.name !== 'string' ||
      !position.name.trim() ||
      position.name.length > 100
    ) {
      throw new Error('Posição com nome inválido.');
    }
    if (position.testPlanPrit !== undefined && typeof position.testPlanPrit !== 'string') {
      throw new Error('Test Plan deve ser texto.');
    }
    if (
      position.testPlans !== undefined &&
      (!record(position.testPlans) ||
        typeof position.testPlans.portugal !== 'string' ||
        typeof position.testPlans.espanha !== 'string')
    ) {
      throw new Error('Planos por país inválidos.');
    }
    if (position.executions !== undefined || position.testPlans === undefined) {
      if (!record(position.executions)) throw new Error('Execuções inválidas.');
      for (const type of ['smoke', 'regression', 'certification', 'defectFixing']) {
        const list = position.executions[type];
        if (
          !Array.isArray(list) ||
          list.length > 500 ||
          list.some((prit) => typeof prit !== 'string')
        ) {
          throw new Error(`${position.name}/${type}: configure uma lista de PRITs.`);
        }
      }
    }
  }
  return value as RunConfig;
}
