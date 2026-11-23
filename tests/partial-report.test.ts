import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  definitionsFromReports,
  loadPreviousReport,
  mergePositionReports,
  parseReportArguments,
  selectPosition,
  validatePreviousPositions,
} from '../src/services/partial-report.service';
import { aggregateOverallResults } from '../src/utils/overall-results.utils';
import { resolvePositions } from '../src/utils/position.utils';
import type { PositionReport, Report } from '../src/types/report.types';

function fixture(): PositionReport[] {
  return ['COCO PT', 'Tangerina'].map((position, index) => ({
    position,
    testPlanPrit: `PRIT-${index + 1}`,
    reports: [
      {
        position,
        prit: `PRIT-${index + 10}`,
        testType: 'smoke',
        title: 'Smoke',
        mainStatus: 'OPEN',
        totalTests: 5,
        executionStatuses: [{ status: 'TODO', quantidade: 5 }],
        issueLinks: [],
      },
    ],
  }));
}

test('accepts any configured position and lists names without extracting', () => {
  const configured = resolvePositions();
  for (const position of configured)
    assert.equal(selectPosition(configured, position.name.toLowerCase()), position);
  assert.deepEqual(parseReportArguments([]), {});
  assert.deepEqual(parseReportArguments(['--list-positions']), { list: true });
  assert.deepEqual(parseReportArguments(['--position', ' COCO PT ']), { position: 'COCO PT' });
  assert.throws(() => selectPosition(configured, 'missing'), /desconhecida/);
  assert.throws(() => parseReportArguments(['--position']), /Use npm/);
  assert.throws(() => parseReportArguments(['--typo']), /Use npm/);
});

test('replaces the whole selected position and recalculates Overall, preserving others', () => {
  const previous = fixture();
  const configured = definitionsFromReports(previous);
  const updated = structuredClone(previous[0]);
  updated.reports[0].prit = 'PRIT-99'; // A execução anterior deixou de pertencer ao plano.
  updated.reports[0].mainStatus = 'DONE';
  updated.reports[0].executionStatuses = [{ status: 'PASS', quantidade: 5 }];
  const merged = mergePositionReports(previous, [updated], configured);
  assert.equal(merged[1], previous[1]);
  assert.equal(merged[0], updated);
  assert.equal(previous[0].reports[0].prit, 'PRIT-10');
  const overall = aggregateOverallResults(merged, [], definitionsFromReports(merged));
  assert.deepEqual({ ...overall.plans[0].types[0].counts }, { PASS: 5 });
  assert.deepEqual({ ...overall.plans[1].types[0].counts }, { TODO: 5 });
  assert.equal(overall.plans[0].types[0].executions, 1);
  assert.deepEqual(
    overall.plans.flatMap((plan) => plan.warnings),
    [],
  );
});

test('updates country-plan positions and their Overall', () => {
  const previous = fixture();
  const automation: PositionReport = {
    position: 'Automação',
    testPlanPrit: '',
    testPlans: { portugal: 'PRIT-50', espanha: 'PRIT-51' },
    reports: (['portugal', 'espanha'] as const).map((testType, index): Report => ({
      ...previous[0].reports[0],
      position: 'Automação',
      prit: `PRIT-${50 + index}`,
      testType,
    })),
  };
  previous.push(automation);
  const configured = definitionsFromReports(previous);
  validatePreviousPositions(previous, configured, 'Automação');
  const updated = structuredClone(automation);
  updated.reports[0].executionStatuses = [{ status: 'PASS', quantidade: 5 }];
  const merged = mergePositionReports(previous, [updated], configured);
  const overall = aggregateOverallResults(merged, [], definitionsFromReports(merged));
  assert.deepEqual(
    overall.plans[2].types.map((type) => ({ ...type.counts })),
    [{ PASS: 5 }, { TODO: 5 }],
  );
  assert.equal(merged[0], previous[0]);
});

test('rejects missing positions and changed sources outside the selected position', () => {
  const previous = fixture();
  const configured = definitionsFromReports(previous);
  validatePreviousPositions(previous, configured, 'COCO PT');
  assert.throws(
    () => validatePreviousPositions(previous.slice(0, 1), configured, 'COCO PT'),
    /lista/,
  );
  configured[1].testPlanPrit = 'PRIT-999';
  assert.throws(() => validatePreviousPositions(previous, configured, 'COCO PT'), /Tangerina/);
  validatePreviousPositions(previous, configured, 'Tangerina');
});

test('loads saved report data and legacy output; fails before extraction on absent or broken JSON', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 't2d-partial-'));
  const links = { testPlans: [{ position: 'COCO PT', prit: 'PRIT-1', title: 'Plan title' }] };
  const dashboard = { pageId: '1', title: 'Open defects', rawTitle: '', total: 0, defects: [] };
  try {
    assert.throws(() => loadPreviousReport(links, directory), /recolha completa/);
    fs.writeFileSync(path.join(directory, 'report.json'), '{');
    assert.throws(() => loadPreviousReport(links, directory), /recolha completa/);
    fs.writeFileSync(
      path.join(directory, 'report.json'),
      JSON.stringify({ positions: fixture(), dashboards: [], releaseLinks: links }),
    );
    fs.writeFileSync(path.join(directory, 'dashboard.json'), JSON.stringify([dashboard]));
    const saved = loadPreviousReport(links, directory);
    assert.deepEqual(saved.positions, fixture());
    assert.deepEqual(saved.releaseLinks, links);
    assert.deepEqual(saved.dashboards, []); // Não reutiliza um dashboard antigo de outra execução.
    fs.writeFileSync(
      path.join(directory, 'report.json'),
      JSON.stringify({
        positions: fixture(),
        overall: { plans: [{ key: 'COCO PT', prit: 'PRIT-1', title: 'Legacy title' }] },
      }),
    );
    const legacy = loadPreviousReport(links, directory);
    assert.deepEqual(legacy.dashboards, [dashboard]);
    assert.equal(legacy.releaseLinks.testPlans[0].title, 'Legacy title');
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
