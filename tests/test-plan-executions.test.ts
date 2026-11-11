import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';

async function loadExtractor() {
  process.env.JIRA_URL = 'https://jira.example.test';
  process.env.JIRA_LOGIN_EMAIL = 'test@example.test';
  return import('../src/extractors/test-plan-executions.extractor');
}

test('descobre execuções na tabela e classifica pelo título', async () => {
  const { extractTestPlanExecutions } = await loadExtractor();
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route('https://jira.example.test/browse/PRIT-100', (route) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<h1 id="summary-val">Release Test Plan</h1>
          <table id="other-table">
            <tbody>
              <tr><td><a class="link-title" href="/browse/PRIT-999">PRIT-999</a></td><td class="issue-link">Smoke - Irrelevant</td></tr>
            </tbody>
          </table>
          <table id="testplan-testexecs-entries-table"
            aria-describedby="testplan-testexecs-entries-table_info">
            <tbody>
              <tr><td><a class="link-title" href="/browse/PRIT-101">PRIT-101</a></td><td class="issue-link">Smoke - Checkout</td></tr>
              <tr><td><a class="link-title" href="/browse/PRIT-102">PRIT-102</a></td><td class="issue-link">Regression - Payments</td></tr>
              <tr><td><a class="link-title" href="/browse/PRIT-103">PRIT-103</a></td><td class="issue-link">Certification - Release</td></tr>
              <tr><td><a class="link-title" href="/browse/PRIT-104">PRIT-104</a></td><td class="issue-link">Defect Fixing - BUG-10</td></tr>
            </tbody>
          </table>
          <div id="testplan-testexecs-entries-table_info" aria-live="polite"></div>`,
      }),
    );

    assert.deepEqual(await extractTestPlanExecutions(page, '100'), [
      { prit: 'PRIT-101', title: 'Smoke - Checkout', testType: 'smoke' },
      { prit: 'PRIT-102', title: 'Regression - Payments', testType: 'regression' },
      { prit: 'PRIT-103', title: 'Certification - Release', testType: 'certification' },
      { prit: 'PRIT-104', title: 'Defect Fixing - BUG-10', testType: 'defectFixing' },
    ]);
  } finally {
    await browser.close();
  }
});

test('normaliza variantes de Defect Fixing e rejeita títulos ambíguos', async () => {
  const { identifyTestType } = await loadExtractor();
  assert.equal(identifyTestType('DEFECT_FIXING: BUG-10'), 'defectFixing');
  assert.equal(identifyTestType('Regression test'), 'regression');
  assert.throws(() => identifyTestType('Smoke Regression'), /mais de um tipo/);
  assert.equal(identifyTestType('Release run'), undefined);
});

test('interrompe a descoberta se uma execução da tabela não tiver tipo no título', async () => {
  const { extractTestPlanExecutions } = await loadExtractor();
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route('https://jira.example.test/browse/PRIT-200', (route) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<h1 id="summary-val">Test Plan</h1>
          <table id="testplan-testexecs-entries-table">
            <tbody>
              <tr><td><a class="link-title" href="/browse/PRIT-201">PRIT-201</a></td><td class="issue-link">Smoke - Checkout</td></tr>
              <tr><td><a class="link-title" href="/browse/PRIT-202">PRIT-202</a></td><td class="issue-link">Unclassified execution</td></tr>
            </tbody>
          </table>`,
      }),
    );

    await assert.rejects(
      extractTestPlanExecutions(page, 'PRIT-200'),
      /não contém Smoke, Regression, Certification ou Defect Fixing/,
    );
  } finally {
    await browser.close();
  }
});
