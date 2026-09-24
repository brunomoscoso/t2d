import assert from 'node:assert/strict';
import test from 'node:test';
import type { Report } from '../src/types/report.types';
import { getPosition } from '../src/utils/position.utils';
import { groupReportsByPosition } from '../src/utils/groupReports.utils';
import { createTxtReport } from '../src/reports/txt.report';

test('agrupa COCO PT e ordena smoke, certification, regression e demais execuções', () => {
  const titles = [
    '[Passport X v5.6.0.17][COCO][PT] - Validation Defect Fixing / Change Request',
    '[Passport X v5.6.0.17] [COCO PT] - Regression Group 0',
    '[Passport X v5.6.0.17] [COCO] [PT] - Regression Grupo 1',
    '[coco_pt] Installation Smoke Tests',
    'Côco-PT: Certification',
  ];

  const reports: Report[] = titles.map((title, index) => ({
    prit: `PRIT-${index}`,
    title,
    mainStatus: 'OPEN',
    labels: [],
    position: getPosition([], title),
    totalTests: 1,
    executionStatuses: [],
    issueLinks: [],
  }));

  const groups = groupReportsByPosition(reports);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].position, 'COCO PT');
  assert.deepEqual(groups[0].reports, [reports[3], reports[4], reports[1], reports[2], reports[0]]);

  const txt = createTxtReport(groups);
  assert.equal(txt.split('\nCOCO PT\n').length - 1, 1);
  for (const report of reports) {
    assert.ok(txt.includes(`\n${report.prit}\n`));
  }
});

test('distingue COCO SP, Tangerina e Pontes', () => {
  for (const title of ['[COCO SP] Regression', '[COCO][SP] Certification']) {
    assert.equal(getPosition([], title), 'COCO SP');
  }
  assert.equal(getPosition([], '[TANGERINA][PT] Regression'), 'Tangerina');
  assert.equal(getPosition([], '[PONTES][PT] Validation'), 'Pontes');
});

test('mantém o tipo explícito junto mesmo quando há um local no título', () => {
  assert.equal(getPosition([], '[COCO PT][Arco do Cego] Regression'), 'COCO PT');
  assert.equal(getPosition([], '[COCO SP][Badajoz] Regression'), 'COCO SP');
  assert.equal(getPosition([], '[TANGERINA][OLIVAIS] Regression'), 'Tangerina');
});

test('reconhece os locais do laboratório e a grafia anterior de Las Rosas', () => {
  assert.equal(getPosition([], '[ARCO_DO_CEGO][PT] Regression'), 'Arco do Cego');
  assert.equal(getPosition([], '[Las-Rozas] Regression'), 'Las Rosas');
  assert.equal(getPosition([], '[LAS_ROSAS] Regression'), 'Las Rosas');
  for (const name of ['Olivais', 'Badajoz', 'Cyber', 'Marinas']) {
    assert.equal(getPosition([], `[${name.toUpperCase()}] Regression`), name);
  }
});

test('usa labels quando o título não identifica o grupo', () => {
  assert.equal(getPosition(['POSITION_COCO_PT'], 'Regression'), 'COCO PT');
  assert.equal(getPosition(['POSIÇÃO: COCO-SP'], 'Regression'), 'COCO SP');
  assert.equal(getPosition(['POSITION_TANGERINA'], 'Regression'), 'Tangerina');
  assert.equal(getPosition(['POSITION_Novo_Local'], 'Regression'), 'Novo Local');
});

test('o título continua tendo prioridade sobre as labels', () => {
  assert.equal(getPosition(['POSITION_TANGERINA'], '[COCO][PT] Regression'), 'COCO PT');
});

test('não deduz o tipo apenas pelo país nem por palavras parcialmente iguais', () => {
  for (const title of ['[PT] Validation', '[SP] Validation', '[COCO] Regression', 'COCO PTX', 'Tangerinas', 'Nova posição']) {
    assert.equal(getPosition([], title), 'SEM POSIÇÃO', title);
  }
});
