import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { parseRunConfig } from '../src/config/run-config';
import { getConfiguredExecutions } from '../src/utils/position.utils';

const config = {
  dashboardPageId: '987',
  positions: [
    {
      name: 'Segundo',
      executions: { smoke: ['20', '10'], regression: [], certification: [], defectFixing: [] },
    },
    {
      name: 'Primeiro',
      executions: { smoke: [], regression: ['30'], certification: [], defectFixing: [] },
    },
    { name: 'Países', testPlans: { portugal: '40', espanha: '50' } },
  ],
};

test('configuração do workflow preserva posições, ordem e planos por país', () => {
  const parsed = parseRunConfig(JSON.stringify(config));
  assert.deepEqual(
    getConfiguredExecutions(parsed.positions).map((e) => e.prit),
    ['PRIT-20', 'PRIT-10', 'PRIT-30', 'PRIT-40', 'PRIT-50'],
  );
});

test('configuração externa rejeita JSON, tipos e tamanho inválidos antes do navegador', () => {
  for (const input of [
    '',
    'null',
    '{}',
    '{',
    JSON.stringify({ ...config, dashboardPageId: '../../bad' }),
    JSON.stringify({ ...config, positions: [{ name: 'P', executions: { smoke: 10 } }] }),
  ]) {
    assert.throws(() => parseRunConfig(input));
  }
  assert.throws(() => parseRunConfig(' '.repeat(60001)), /60 KB/);
  const repeated = structuredClone(config);
  repeated.positions[0].executions!.smoke = ['20', 'PRIT-20'];
  assert.throws(
    () => getConfiguredExecutions(parseRunConfig(JSON.stringify(repeated)).positions),
    /repetido/,
  );
});

test('todos os consumidores usam a configuração externa sem recorrer aos PRITs locais', () => {
  const script = `
    const { getConfiguredExecutions } = require('./src/utils/position.utils.ts');
    const { getConfiguredReleaseLinks } = require('./src/utils/release-links.utils.ts');
    const { groupReportsByPosition } = require('./src/utils/groupReports.utils.ts');
    const { aggregateOverallResults } = require('./src/utils/overall-results.utils.ts');
    console.log(JSON.stringify({ executions: getConfiguredExecutions(), links: getConfiguredReleaseLinks(), overall: aggregateOverallResults(groupReportsByPosition([])) }));
  `;
  const result = JSON.parse(
    execFileSync(process.execPath, ['--import', 'tsx', '-e', script], {
      cwd: process.cwd(),
      encoding: 'utf8',
      env: { ...process.env, T2D_CONFIG_JSON: JSON.stringify(config) },
    }),
  );
  assert.deepEqual(
    result.executions.map((e: { prit: string }) => e.prit),
    ['PRIT-20', 'PRIT-10', 'PRIT-30', 'PRIT-40', 'PRIT-50'],
  );
  assert.equal(result.links.dashboardPageId, '987');
  assert.deepEqual(
    result.overall.plans.map((p: { label: string }) => p.label),
    ['Segundo', 'Primeiro', 'Países'],
  );
});
