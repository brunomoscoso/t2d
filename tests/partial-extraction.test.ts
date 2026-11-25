import assert from 'node:assert/strict';
import test from 'node:test';
import type { APIRequestContext, APIResponse } from 'playwright';
import {
  collectExecutionFields,
  unavailableExecution,
} from '../src/services/partial-extraction.service';
import {
  dataDifferences,
  readXrayPages,
  waitForVerifiedData,
  UnverifiedExtractionError,
} from '../src/services/extraction-verification.service';
import { createHtmlReport } from '../src/reports/html.report';
import { createEmailReport } from '../src/reports/email.report';
import { createTxtReport } from '../src/reports/txt.report';
import { groupReportsByPosition } from '../src/utils/groupReports.utils';
import { aggregateOverallResults } from '../src/utils/overall-results.utils';
import type { ExecutionData, PositionDefinition } from '../src/types/report.types';

const complete: ExecutionData = {
  prit: 'PRIT-1',
  title: 'Smoke',
  mainStatus: 'OPEN',
  fixVersions: ['v1'],
  totalTests: 2,
  executionStatuses: [{ status: 'PASS', quantidade: 2 }],
  issueLinks: [],
};
const definitions: PositionDefinition[] = [
  {
    name: 'COCO PT',
    testPlanPrit: 'PRIT-100',
    executions: { smoke: ['PRIT-1'], regression: [], certification: [], defectFixing: [] },
  },
];

test('campos com falha são identificados sem perder os campos extraídos', async () => {
  const partial = await collectExecutionFields('PRIT-1', {
    title: async () => 'Smoke',
    mainStatus: async () => 'OPEN',
    fixVersions: async () => ['v1'],
    totalTests: async () => {
      throw new Error('Timeout do total');
    },
    executionStatuses: async () => {
      throw new Error('Xray não carregou');
    },
    issueLinks: async () => {
      throw new Error('<script>alert(1)</script>');
    },
  });
  assert.equal(partial.title, 'Smoke');
  assert.deepEqual(partial.fixVersions, ['v1']);
  assert.equal(partial.totalTests, null);
  assert.deepEqual(
    partial.extractionWarnings?.map((warning) => warning.field),
    ['totalTests', 'executionStatuses', 'issueLinks'],
  );
  const positions = groupReportsByPosition([partial], definitions);
  const overall = aggregateOverallResults(positions, [], definitions);
  assert.equal(overall.plans[0].types[0].available, false);
  for (const html of [
    createHtmlReport(positions, undefined, overall),
    createEmailReport(positions, undefined, overall),
  ]) {
    assert.match(html, /Relatório parcial/);
    assert.match(html, /COCO PT \/ PRIT-1/);
    assert.match(html, /Issue Links indisponíveis ou não confirmados/);
    assert.ok(!html.includes('<script>alert(1)</script>'));
  }
  assert.match(createTxtReport(positions), /Timeout do total/);
  assert.deepEqual(
    JSON.parse(JSON.stringify(positions))[0].reports[0].extractionWarnings,
    partial.extractionWarnings,
  );
});

test('não aceita lista estável incompleta e preserva o último snapshot no timeout', async () => {
  const expected = {
    ...complete,
    issueLinks: [
      { prit: 'BUG-1', titulo: 'Erro', status: 'Open', relation: 'blocks', priority: 'High' },
    ],
  };
  await assert.rejects(
    waitForVerifiedData(expected, async () => complete, 20),
    (error: unknown) => {
      assert.ok(error instanceof UnverifiedExtractionError);
      assert.deepEqual(error.fields, ['issueLinks']);
      assert.equal(error.data.title, 'Smoke');
      return true;
    },
  );
  assert.deepEqual(dataDifferences(complete, { ...complete, totalTests: null }), ['totalTests']);
  assert.equal(unavailableExecution('PRIT-1', 'Falha de rede').extractionWarnings?.length, 6);
});

test('paginação não termina cedo quando o servidor reduz o limite e rejeita repetição', async () => {
  let calls = 0;
  const request = {
    get: async () =>
      ({
        ok: () => true,
        json: async () => (++calls < 3 ? [{ key: `TEST-${calls}`, status: 'PASS' }] : []),
        dispose: async () => {},
      }) as APIResponse,
  } as APIRequestContext;
  assert.equal((await readXrayPages(request, 'https://jira.test/test')).length, 2);
  assert.equal(calls, 3);
  request.get = async () =>
    ({
      ok: () => true,
      json: async () => [{ key: 'TEST-1' }],
      dispose: async () => {},
    }) as APIResponse;
  await assert.rejects(readXrayPages(request, 'https://jira.test/test'), /Paginação Xray repetida/);
});

test('falha de descoberta deixa todos os agregados da posição indisponíveis', () => {
  const positions = groupReportsByPosition([], [{ name: 'COCO PT', testPlanPrit: 'PRIT-100' }]);
  positions[0].extractionWarnings = ['PRIT-100: execuções não descobertas'];
  const overall = aggregateOverallResults(
    positions,
    [],
    [{ name: 'COCO PT', testPlanPrit: 'PRIT-100' }],
  );
  assert.ok(overall.plans[0].types.every((type) => !type.available));
  assert.match(createTxtReport(positions), /execuções não descobertas/);
});
