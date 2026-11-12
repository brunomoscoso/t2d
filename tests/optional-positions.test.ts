import assert from 'node:assert/strict';
import test from 'node:test';
import type { ExecutionData, PositionDefinition } from '../src/types/report.types';
import { getConfiguredExecutions } from '../src/utils/position.utils';
import { groupReportsByPosition, groupReportsByTestType } from '../src/utils/groupReports.utils';
import { aggregateOverallResults } from '../src/utils/overall-results.utils';
import { getConfiguredReleaseLinks } from '../src/utils/release-links.utils';
import { extractReleaseLinks } from '../src/extractors/release-links.extractor';
import type { APIRequestContext } from 'playwright';
import { createReleaseLinksSection } from '../src/reports/release-links.report';
import { createPositionPicker } from '../src/reports/global-status.report';

test('automação é uma posição com planos por país e sem tipos de execução', () => {
  const configured: PositionDefinition[] = [
    { name: 'Automação', testPlans: { portugal: '100', espanha: 'PRIT-200' } },
  ];
  const links = getConfiguredReleaseLinks(configured);
  assert.deepEqual(links.testPlans, [
    { position: 'Automação', label: 'Automação — Portugal', prit: 'PRIT-100' },
    { position: 'Automação', label: 'Automação — Espanha', prit: 'PRIT-200' },
  ]);
  const html = createReleaseLinksSection(links);
  assert.equal((html.match(/data-report-position="Automação"/g) || []).length, 2);
  assert.deepEqual(getConfiguredExecutions(configured), [
    { prit: 'PRIT-100', position: configured[0].name, testType: 'portugal' },
    { prit: 'PRIT-200', position: configured[0].name, testType: 'espanha' },
  ]);
  const grouped = groupReportsByPosition([], configured);
  assert.equal(grouped[0].position, 'Automação');
  assert.deepEqual(
    groupReportsByTestType(grouped[0]).map((group) => group.testType),
    ['portugal', 'espanha'],
  );
  const plan = aggregateOverallResults(grouped, links.testPlans, configured).plans[0];
  assert.equal(plan.types.length, 2);
  assert.ok(plan.types.every((type) => !type.available));
  assert.match(createPositionPicker(grouped), /value="Automação" checked/);
  assert.throws(
    () => getConfiguredExecutions([...configured, position('COCO PT', '', ['100'])]),
    /usado como execução/,
  );
});

function position(name: string, testPlanPrit = '', smoke: string[] = []): PositionDefinition {
  return {
    name,
    testPlanPrit,
    executions: { smoke, regression: [], certification: [], defectFixing: [] },
  };
}

const report: ExecutionData = {
  prit: 'PRIT-1',
  title: 'Smoke',
  mainStatus: 'OPEN',
  totalTests: 2,
  executionStatuses: [{ status: 'PASS', quantidade: 2 }],
  issueLinks: [],
};

test('OPT sem PRITs não interfere na coleta e nos resultados das outras posições', () => {
  const configured = [
    position('COCO PT', 'PRIT-100', ['PRIT-1']),
    position('OPT PT'),
    position('OPT SP'),
    position('Olivais'),
  ];
  assert.deepEqual(getConfiguredExecutions(configured), [
    { prit: 'PRIT-1', position: 'COCO PT', testType: 'smoke' },
  ]);
  const grouped = groupReportsByPosition([report], configured);
  assert.deepEqual(
    grouped.map((item) => item.reports.length),
    [1, 0, 0, 0],
  );
  const overall = aggregateOverallResults(grouped, [], configured);
  assert.equal(overall.plans[0].types[0].counts.PASS, 2);
  assert.deepEqual(
    overall.plans.flatMap((plan) => plan.warnings),
    [],
  );
});

for (const name of ['OPT PT', 'OPT SP', 'COCO PT']) {
  test(`${name}: execuções são coletadas e agregadas sem Test Plan`, () => {
    const configured = [position(name, '', ['1'])];
    assert.deepEqual(getConfiguredExecutions(configured), [
      { prit: 'PRIT-1', position: name, testType: 'smoke' },
    ]);
    const grouped = groupReportsByPosition([report], configured);
    const overall = aggregateOverallResults(grouped, [], configured);
    assert.equal(grouped[0].testPlanPrit, '');
    assert.equal(overall.plans[0].types[0].counts.PASS, 2);
    assert.equal(overall.plans[0].types[0].available, true);
    assert.deepEqual(overall.plans[0].warnings, []);
  });
}

test('posto somente com Test Plan não acrescenta execuções à coleta', async () => {
  const configured = [
    position('COCO PT', '', ['PRIT-1']),
    position('OPT PT', 'PRIT-100'),
    position('OPT SP'),
  ];
  assert.equal(getConfiguredExecutions(configured).length, 1);
  const requests: string[] = [];
  const request = {
    async get(url: string) {
      requests.push(url);
      return {
        ok: () => true,
        json: async () => ({ fields: { summary: 'Plano OPT' } }),
        dispose: async () => {},
      };
    },
  } as unknown as APIRequestContext;
  const links = await extractReleaseLinks(
    request,
    { ...getConfiguredReleaseLinks(configured), dashboardPageId: '' },
    'https://jira.example',
  );
  assert.deepEqual(requests, ['https://jira.example/rest/api/2/issue/PRIT-100?fields=summary']);
  assert.equal(links.testPlans[1].title, 'Plano OPT');
});

test('plano opcional preserva a validação de PRITs e os avisos de coleta incompleta', () => {
  assert.throws(
    () => getConfiguredExecutions([position('OPT PT', '', ['inválido'])]),
    /PRIT inválido/,
  );
  assert.throws(
    () => getConfiguredExecutions([position('OPT PT', '', ['1', 'PRIT-1'])]),
    /repetido/,
  );
  assert.throws(
    () => getConfiguredExecutions([position('OPT PT', 'PRIT-1', ['1'])]),
    /usado como execução/,
  );
  const configured = [position('OPT PT', '', ['PRIT-1'])];
  const overall = aggregateOverallResults(groupReportsByPosition([], configured), [], configured);
  assert.equal(overall.plans[0].types[0].available, false);
  assert.match(overall.plans[0].warnings[0], /execuções não coletadas/);
});
