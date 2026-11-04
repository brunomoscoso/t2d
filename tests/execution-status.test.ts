import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { extractExecutionStatuses } from '../src/extractors/execution-status.extractor';

test('status oculto não interrompe a execução e preserva dados anteriores e posteriores ao timeout', async () => {
  process.env.JIRA_URL = 'https://jira.example.test';
  process.env.JIRA_LOGIN_EMAIL = 'test@example.test';
  const { extractPrit } = await import('../src/extractors/prit.extractor');
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route('**/browse/PRIT-123', (route) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: `<h1 id="summary-val">Execução sem testes</h1>
        <span id="status-val">OPEN</span><div id="labels-wrap"><a>release</a></div>
        <h5 hidden>Overall Execution Status</h5>
        <div id="linkingmodule"><ul><li>
          <a class="issue-link link-title">BUG-1</a>
          <span class="link-summary">Defeito vinculado</span>
          <span class="jira-issue-status-lozenge">OPEN</span>
          <span data-priority="High"></span>
        </li></ul></div>`,
      }),
    );
    const report = await extractPrit(page, 'PRIT-123');
    assert.equal(report.title, 'Execução sem testes');
    assert.equal(report.mainStatus, 'OPEN');
    assert.deepEqual(report.labels, ['release']);
    assert.deepEqual(report.executionStatuses, []);
    assert.equal(report.totalTests, null);
    assert.deepEqual(report.issueLinks, [
      {
        relation: 'related',
        prit: 'BUG-1',
        titulo: 'Defeito vinculado',
        status: 'OPEN',
        priority: 'High',
      },
    ]);
  } finally {
    await browser.close();
  }
});

test('fallback de status preserva PENDING_3RD e status adicionais com algarismos', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(`<section><h2>Overall Execution Status</h2>
      <div>3 PASS 2 FOR_TESTING 4 PENDING_3RD 5 CUSTOM_2 1 TODO</div>
      <div>Total Tests: 15</div></section>`);
    assert.deepEqual(await extractExecutionStatuses(page), [
      { status: 'PASS', quantidade: 3 },
      { status: 'FOR_TESTING', quantidade: 2 },
      { status: 'PENDING_3RD', quantidade: 4 },
      { status: 'CUSTOM_2', quantidade: 5 },
      { status: 'TODO', quantidade: 1 },
    ]);
  } finally {
    await browser.close();
  }
});

test('falha explicitamente quando a secção de status não tem resultados', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(
      '<section><h2>Overall Execution Status</h2><div>Loading...</div></section>',
    );
    await assert.rejects(extractExecutionStatuses(page), /não contém dados|nenhum status/i);
  } finally {
    await browser.close();
  }
});
