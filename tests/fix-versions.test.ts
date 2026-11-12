import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { extractFixVersions } from '../src/extractors/fix-versions.extractor';
import { createEmailReport } from '../src/reports/email.report';
import type { ExecutionData, PositionDefinition, PositionReport } from '../src/types/report.types';
import { groupReportsByPosition } from '../src/utils/groupReports.utils';

test('agrupa as Fix Version/s extraídas das executions pelo respetivo posto', () => {
  const configured: PositionDefinition[] = [
    {
      name: 'Posto A',
      testPlanPrit: 'PRIT-100',
      executions: {
        smoke: ['PRIT-1'],
        regression: ['PRIT-2'],
        certification: [],
        defectFixing: [],
      },
    },
  ];
  const execution = (prit: string, fixVersions: string[]): ExecutionData => ({
    prit,
    fixVersions,
    title: `Execution ${prit}`,
    mainStatus: 'OPEN',
    labels: [],
    totalTests: 1,
    executionStatuses: [],
    issueLinks: [],
  });

  const positions = groupReportsByPosition(
    [
      execution('PRIT-1', ['PPX v5.6.0.21']),
      execution('PRIT-2', ['PPX v5.6.0.21', 'PPX v5.6.0.22']),
    ],
    configured,
  );

  assert.deepEqual(positions[0].fixVersions, ['PPX v5.6.0.21', 'PPX v5.6.0.22']);
});

test('extrai Fix Version/s da execution e atualiza o relatório sem restaurar valores antigos', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setContent(`<label for="fixVersions"> Fix Version/s: </label>
      <div id="labels-wrap"><a>Outra label</a></div>
      <span id="fixfor-val"><span><a title="Descrição longa"> PPX v5.6.0.21 </a>
      <a>PPX v5.6.0.21</a><a>PPX v5.6.0.22</a></span>
      <span role="button" aria-label="Edit Fix Version/s">Editar</span></span>`);
    const versions = await extractFixVersions(page);
    assert.deepEqual(versions, ['PPX v5.6.0.21', 'PPX v5.6.0.22']);
    await page.locator('label').evaluate((element) => {
      element.textContent = 'Affects Version/s:';
    });
    await assert.rejects(extractFixVersions(page), /não corresponde/);
    await page.locator('label').evaluate((element) => {
      element.textContent = 'Fix Version/s:';
    });
    await page.locator('#fixfor-val').evaluate((element) => {
      element.textContent = 'None';
    });
    assert.deepEqual(await extractFixVersions(page), []);

    const positions: PositionReport[] = [
      { position: 'Posto A', testPlanPrit: 'PRIT-100', reports: [], fixVersions: versions },
      {
        position: 'Posto B',
        testPlanPrit: 'PRIT-200',
        reports: [],
        fixVersions: ['PPX v5.6.0.22'],
      },
    ];
    await page.route('http://versions.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html; charset=utf-8',
        body: createEmailReport(positions, undefined, { plans: [] }),
      }),
    );
    await page.goto('http://versions.test/email.html');
    const version = page.getByLabel('Versão instalada de Posto A', { exact: true });
    assert.equal(await version.inputValue(), versions.join(', '));
    assert.match(
      await page.locator('#observations strong').innerText(),
      /Passport X v5\.6\.0\.21 \/ v5\.6\.0\.22/,
    );
    await version.fill('Versão antiga');
    await page.getByLabel('Status de instalação de Posto A', { exact: true }).selectOption('ok');
    positions[0].fixVersions = ['PPX v5.6.0.23 <QA>'];
    await page.reload();
    assert.equal(await version.inputValue(), 'PPX v5.6.0.23 <QA>');
    assert.equal(
      await page.getByLabel('Status de instalação de Posto A', { exact: true }).inputValue(),
      'ok',
    );
    assert.match(await page.locator('#observations').innerText(), /v5\.6\.0\.23 <QA>/);
    assert.equal(await page.locator('#observations qa').count(), 0);

    await page.evaluate(() => {
      document.addEventListener('copy', (event) => {
        const container = document.createElement('div');
        container.append(window.getSelection()!.getRangeAt(0).cloneContents());
        (window as typeof window & { copied: string }).copied = container.innerHTML;
        event.preventDefault();
      });
    });
    await page.locator('#copy-email-button').click();
    const copied = await page.evaluate(() => (window as typeof window & { copied: string }).copied);
    assert.ok(copied.includes('PPX v5.6.0.23 &lt;QA&gt;'));
    assert.ok(!copied.includes('Versão antiga'));
    positions.forEach((position) => {
      position.fixVersions = [];
    });
    await page.reload();
    assert.equal(await version.inputValue(), '');
    assert.match(await page.locator('#observations').innerText(), /versão não informada/);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
