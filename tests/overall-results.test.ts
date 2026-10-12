import assert from 'node:assert/strict';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import {
  aggregateOverallResults,
  getExecutionMarket,
  overallPercentage,
} from '../src/utils/overall-results.utils';
import { createEmailReport } from '../src/reports/email.report';
import { createHtmlReport } from '../src/reports/html.report';
import { writeReports } from '../src/reports/report.writer';
import type { PositionReport, ReleaseLinks, Report } from '../src/types/report.types';

function execution(prit: string, title: string, counts: Record<string, number>): Report {
  return {
    prit,
    title,
    mainStatus: 'OPEN',
    position: 'COCO PT',
    labels: ['SP'],
    issueLinks: [],
    totalTests: Object.values(counts).reduce((total, count) => total + count, 0),
    executionStatuses: Object.entries(counts).map(([status, quantidade]) => ({
      status,
      quantidade,
    })),
  };
}

function fixture(): { positions: PositionReport[]; links: ReleaseLinks } {
  const reports = [
    execution('PRIT-1', '[COCO][PT] Smoke', { PASS: 1, TODO: 1 }),
    execution('PRIT-2', 'coco_pt_regression', { PASS: 8, FAIL: 1, TODO: 1 }),
    execution('PRIT-3', 'SP-Certification', {
      PASS: 3,
      EXECUTING: 1,
      ABORTED: 1,
      BLOCKED: 1,
      'FOR TESTING': 1,
      PENDING_3RD: 1,
      'CUSTOM <QA> & "STATUS" $&': 2,
    }),
    execution('PRIT-4', 'PASSPORT SCRIPT', { PASS: 99 }),
    execution('PRIT-5', '[PT][SP]', { FAIL: 99 }),
    execution('PRIT-6', '[PT] Sem plano', { FAIL: 99 }),
  ];
  return {
    positions: [
      { position: 'COCO PT', reports },
      { position: 'Outra posição', reports: [reports[0]] },
    ],
    links: {
      testPlans: {
        smokes: {
          prit: '8161',
          title: 'Smokes <QA> & "release" $&',
          executionPrits: ['PRIT-1', 'PRIT-2', 'PRIT-3', 'PRIT-4', 'PRIT-5', 'PRIT-999'],
        },
        certification: { prit: 'PRIT-8157', executionPrits: ['PRIT-3'] },
        regression: { prit: '8165', executionPrits: ['PRIT-1', 'PRIT-1'] },
        defectFixing: { prit: '8171', executionPrits: [] },
      },
      dashboardPageId: '24419',
    },
  };
}

test('classifica mercados somente por siglas delimitadas e rejeita títulos ambíguos', () => {
  for (const market of ['PT', 'SP'] as const) {
    for (const title of [
      market,
      `[${market}]`,
      `COCO ${market} Smoke`,
      `coco-${market.toLowerCase()}-smoke`,
      `coco_${market}_smoke`,
      `${market}/${market}`,
      `(${market})`,
      `Teste — ${market}`,
    ]) {
      assert.equal(getExecutionMarket(title), market, title);
    }
  }
  for (const title of [
    'PASSPORT',
    'SCRIPT',
    'SPARE',
    'ADAPTOR',
    'PT1',
    '1SP',
    'áPT',
    'SPé',
    'SP\u0301',
    '[PT][SP]',
    'PT_SP',
    'PT-SP',
    'PT/SP',
    '',
    'Portugal Espanha',
  ]) {
    assert.equal(getExecutionMarket(title), undefined, title);
  }
});

test('soma por plano e mercado, mantém status adicionais e não calcula média de percentuais', () => {
  const { positions, links } = fixture();
  const original = structuredClone({ positions, links });
  const overall = aggregateOverallResults(positions, links.testPlans);
  const [smokes, certification, regression, defects] = overall.plans;
  assert.equal(smokes.markets.PT.total, 12);
  assert.equal(smokes.markets.PT.executions, 2, 'PRIT repetido noutro posto conta uma vez');
  assert.equal(smokes.markets.PT.counts.PASS, 9);
  assert.equal(overallPercentage(smokes.markets.PT.counts.PASS, smokes.markets.PT.total), '75%');
  assert.equal(smokes.markets.SP.total, 10, 'Não usa a posição nem a label SP para classificar PT');
  assert.equal(smokes.markets.SP.counts.FOR_TESTING, 1);
  assert.equal(smokes.markets.SP.counts['CUSTOM_<QA>_&_"STATUS"_$&'], 2);
  assert.deepEqual(smokes.statuses.slice(0, 8), [
    'PASS',
    'TODO',
    'EXECUTING',
    'FAIL',
    'ABORTED',
    'BLOCKED',
    'FOR_TESTING',
    'PENDING_3RD',
  ]);
  assert.equal(certification.markets.SP.total, 10);
  assert.equal(certification.markets.PT.total, 0);
  assert.equal(regression.markets.PT.total, 2, 'Cada plano conta as suas execuções uma vez');
  assert.equal(regression.markets.SP.executions, 0);
  assert.equal(defects.markets.PT.total, 0);
  assert.equal(defects.markets.SP.total, 0);
  assert.equal(overallPercentage(0, 0), '0%');
  assert.equal(overallPercentage(12, 12), '100%');
  assert.equal(overallPercentage(1, 12), '8.3%');
  assert.equal(smokes.warnings.length, 2);
  assert.match(smokes.warnings.join(' '), /PRIT-4.*PRIT-5/);
  assert.match(overall.warnings.join(' '), /PRIT-6/);
  assert.deepEqual({ positions, links }, original);
});

test('distingue consulta indisponível de mercado vazio e sinaliza dados incompletos', () => {
  const { positions, links } = fixture();
  delete links.testPlans.smokes.executionPrits;
  links.testPlans.certification.prit = '';
  positions[0].reports[0].executionStatuses = [
    { status: ' to-do ', quantidade: 2 },
    { status: 'TODO', quantidade: 1 },
    { status: 'NEW_STATUS_2', quantidade: 3 },
    { status: 'FAIL', quantidade: -1 },
    { status: '', quantidade: 4 },
    { status: 'PASS', quantidade: NaN },
  ];
  const [smokes, certification, regression, defects] = aggregateOverallResults(
    positions,
    links.testPlans,
  ).plans;
  assert.equal(smokes.available, false);
  assert.match(smokes.warnings[0], /indisponíveis/);
  assert.equal(certification.available, false);
  assert.match(certification.warnings[0], /não configurado/);
  assert.equal(defects.available, true);
  assert.equal(regression.markets.PT.counts.TODO, 3);
  assert.equal(regression.markets.PT.total, 6);
  assert.equal(regression.warnings.length, 4);
  positions[0].reports[0].executionStatuses = [];
  positions[0].reports[0].totalTests = null;
  assert.match(
    aggregateOverallResults(positions, links.testPlans).plans[2].warnings[0],
    /não coletados/,
  );
});

test('o writer entrega os mesmos agregados às duas versões HTML e preserva os dados por posição', (t) => {
  const { positions, links } = fixture();
  t.mock.method(console, 'warn', () => {});
  t.mock.method(console, 'log', () => {});
  const cwd = process.cwd();
  const temporaryRoot = fs.realpathSync(tmpdir());
  const directory = fs.mkdtempSync(path.join(temporaryRoot, 't2d-overall-'));
  try {
    fs.mkdirSync(path.join(directory, 'src/templates'), { recursive: true });
    fs.copyFileSync(
      path.join(cwd, 'src/templates/email-body.html'),
      path.join(directory, 'src/templates/email-body.html'),
    );
    process.chdir(directory);
    writeReports(positions, undefined, links);
    for (const file of ['report.html', 'email.html']) {
      const html = fs.readFileSync(path.join('output', file), 'utf8');
      assert.ok(html.includes('Overall Test Results'));
      assert.ok(html.includes('75%'));
      assert.ok(html.includes('data-test-plan-toggle'));
      assert.ok(!html.includes('<!-- OVERALL RESULTS -->'));
    }
    assert.deepEqual(JSON.parse(fs.readFileSync('output/report.json', 'utf8')), positions);
    assert.ok(fs.readFileSync('output/report.txt', 'utf8').includes('Outra posição'));
  } finally {
    process.chdir(cwd);
    const cleanupDirectory = fs.realpathSync(directory);
    assert.equal(path.dirname(cleanupDirectory), temporaryRoot);
    assert.ok(path.basename(cleanupDirectory).startsWith('t2d-overall-'));
    fs.rmSync(cleanupDirectory, { recursive: true, force: true });
  }
});

test('edita, restaura e exporta apenas os planos selecionados, preservando o editor e o detalhe', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const { positions, links } = fixture();
    let html = createEmailReport(positions, links);
    await page.route('http://overall.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: html }),
    );
    await page.goto('http://overall.test/email.html');
    const picker = page.getByRole('group', { name: 'Selecione os Test Plans' });
    const selected = page.locator('[data-overall-plan]:visible');
    assert.equal(await picker.getByRole('checkbox').count(), 4);
    assert.equal(await selected.count(), 0);
    const detailBefore = await page.locator('.position-block').allTextContents();
    await page.locator('[data-test-plan-toggle][value="smokes"]').focus();
    await page.keyboard.press('Space');
    assert.equal(await selected.count(), 1);
    assert.equal(await page.locator('#overall-plan-count').textContent(), '1 plano selecionado');
    const smokes = page.locator('[data-overall-plan="smokes"]');
    assert.match(await smokes.locator('h3').innerText(), /Smokes <QA> & "release" \$&.*PRIT-8161/);
    assert.equal(await smokes.locator('img').count(), 0);
    const pt = smokes.locator('[data-overall-market="PT"]');
    assert.equal(await pt.locator('[data-overall-status="PASS"] strong').innerText(), '9');
    assert.equal(await pt.locator('[data-overall-status="PASS"] span').innerText(), '75%');
    assert.equal(await pt.locator('[data-overall-total] span').innerText(), '100%');
    assert.equal(await smokes.locator('thead th').count(), 11);
    await page.reload();
    assert.equal(await selected.count(), 1);
    await page.locator('[data-select-all-test-plans]').click();
    assert.equal(await selected.count(), 4);
    const empty = page.locator('[data-overall-plan="defectFixing"]');
    assert.equal(
      await empty
        .locator('tbody strong')
        .allTextContents()
        .then((values) => values.every((value) => value === '0')),
      true,
    );
    assert.equal(
      await empty
        .locator('tbody td span')
        .allTextContents()
        .then((values) => values.every((value) => value === '0%')),
      true,
    );
    assert.match(await empty.innerText(), /Sem execuções/);
    await page.locator('[data-clear-test-plans]').click();
    await page.reload();
    assert.equal(await selected.count(), 0, 'Limpar a seleção é persistido');

    await page.evaluate(() => {
      document.execCommand = () => {
        const data = new DataTransfer();
        document.dispatchEvent(
          new ClipboardEvent('copy', { clipboardData: data, bubbles: true, cancelable: true }),
        );
        (window as any).copiedOverall = {
          html: data.getData('text/html'),
          text: data.getData('text/plain'),
        };
        return true;
      };
    });
    await page.locator('#copy-email-button').click();
    assert.ok(
      !(await page.evaluate(() => (window as any).copiedOverall.html)).includes(
        'overall-results-section',
      ),
    );
    await page.locator('[data-test-plan-toggle][value="smokes"]').check();
    await page.locator('[data-test-plan-toggle][value="defectFixing"]').check();
    const preview = await browser.newPage();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
        ),
      );
      const beforeCopy = await page
        .locator('.email-container')
        .evaluate((element) => element.outerHTML);
      await page.locator('#copy-email-button').click();
      const copied = await page.evaluate(() => (window as any).copiedOverall);
      assert.ok(!copied.text.includes('Selecione os Test Plans'));
      assert.ok(copied.text.includes('Overall Test Results'));
      await preview.setContent(`<div id="destination" style="width:320px">${copied.html}</div>`);
      assert.deepEqual(
        await preview
          .locator('[data-overall-plan]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-overall-plan'))),
        ['smokes', 'defectFixing'],
      );
      assert.equal(
        await preview
          .locator(
            'input, select, textarea, script, [data-editor-only], [contenteditable], [data-report-scroll]',
          )
          .count(),
        0,
      );
      assert.equal(await preview.locator('.overall-results-table').count(), 2);
      assert.equal(await preview.locator('[data-overall-plan="smokes"] thead th').count(), 11);
      assert.equal(
        await preview
          .locator(
            '[data-overall-plan="smokes"] [data-overall-market="PT"] [data-overall-status="PASS"]',
          )
          .innerText(),
        '9\n75%',
      );
      assert.ok(
        await preview.locator('.overall-results-table').evaluateAll((tables) =>
          tables.every((table) => {
            const box = table.getBoundingClientRect();
            const parent = document.getElementById('destination')!.getBoundingClientRect();
            return box.right <= parent.right + 1 && table.scrollWidth <= table.clientWidth + 1;
          }),
        ),
      );
      assert.equal(
        await page.locator('.email-container').evaluate((element) => element.outerHTML),
        beforeCopy,
      );
    }
    assert.deepEqual(await page.locator('.position-block').allTextContents(), detailBefore);
    const beforeFailure = await page
      .locator('.email-container')
      .evaluate((element) => element.outerHTML);
    for (const throws of [false, true]) {
      await page.evaluate((shouldThrow) => {
        document.execCommand = () => {
          if (shouldThrow) throw new Error('Cópia bloqueada');
          return false;
        };
      }, throws);
      await page.locator('#copy-email-button').click();
      assert.equal(
        await page.locator('.email-container').evaluate((element) => element.outerHTML),
        beforeFailure,
      );
    }
    await page.emulateMedia({ media: 'print' });
    assert.equal(await picker.isVisible(), false);
    assert.equal(await selected.count(), 2);
    await page.emulateMedia({ media: 'screen' });

    links.testPlans.smokes.prit = '9999';
    html = createEmailReport(positions, links);
    await page.reload();
    assert.equal(await selected.count(), 0, 'Outra configuração de planos não herda a seleção');
    await page.evaluate(() => {
      const section = document.getElementById('overall-results-section')!;
      localStorage.setItem(
        't2d:overall-results:v1:' + location.pathname + ':' + section.dataset.reportKey,
        '[null,{},123,"unknown","smokes"]',
      );
    });
    await page.reload();
    assert.equal(await selected.count(), 1);
    await page.evaluate(() => {
      const section = document.getElementById('overall-results-section')!;
      localStorage.setItem(
        't2d:overall-results:v1:' + location.pathname + ':' + section.dataset.reportKey,
        '{invalid',
      );
    });
    await page.reload();
    assert.equal(await selected.count(), 0);
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Indisponível');
        },
      });
    });
    await page.reload();
    await page.locator('[data-select-all-test-plans]').click();
    assert.equal(await selected.count(), 4);

    html = createHtmlReport(positions, links);
    await page.goto('http://overall.test/report.html');
    await page.locator('[data-select-all-test-plans]').click();
    assert.equal(await selected.count(), 4, 'A versão report.html usa o mesmo seletor');
    await page.setViewportSize({ width: 320, height: 1000 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
      ),
    );
    html = createEmailReport([]);
    await page.goto('http://overall.test/empty.html');
    await page.locator('[data-select-all-test-plans]').click();
    assert.equal(await selected.count(), 4, 'O catálogo está disponível mesmo sem execuções');
    assert.match(await selected.first().innerText(), /indisponíveis/);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
