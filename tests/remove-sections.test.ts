import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { chromium } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import { createDashboardEmailHtml } from '../src/reports/dashboard.report';
import { createPositionDefectsSection } from '../src/reports/position-defects.report';

test('exclui secções individualmente e respeita a exclusão na cópia e no download', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const dashboards = ['Dashboard A', 'Dashboard B']
      .map((title) =>
        createDashboardEmailHtml({ pageId: title, title, rawTitle: title, total: 0, defects: [] }),
      )
      .join('');
    await page.setContent(createEmailReport([]).replace('<!-- DASHBOARD -->', dashboards));
    // Exibe uma secção de defects isolada para testar o controlo mesmo sem dados Jira.
    await page.locator('#position-defects-section').evaluate(
      (section, html) => {
        section.outerHTML = html;
      },
      createPositionDefectsSection([]).replace(' hidden ', ' '),
    );
    await page
      .getByRole('button', { name: 'Excluir Defects criados na sprint do relatório' })
      .click();
    assert.equal(await page.locator('#position-defects-section').count(), 0);
    await page.getByRole('button', { name: 'Excluir Dashboard A do relatório' }).click();
    assert.equal(await page.locator('.dashboard-block').count(), 1);
    assert.match(await page.locator('.dashboard-block').innerText(), /Dashboard B/);
    const copied = await page.evaluate(() => {
      const report = document.querySelector('.email-container')!.cloneNode(true) as HTMLElement;
      (window as any).prepareReportForCopy(report, []);
      return report.outerHTML;
    });
    assert.ok(!copied.includes('Dashboard A'));
    assert.ok(!copied.includes('position-defects-section'));
    assert.ok(!copied.includes('data-remove-report-section'));
    assert.ok(copied.includes('Dashboard B'));
    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar relatório completo' }).click();
    const download = await downloading;
    const saved = fs.readFileSync((await download.path())!, 'utf8');
    assert.ok(!saved.includes('Dashboard A'));
    assert.ok(!saved.includes('id="position-defects-section"'));
    assert.ok(!saved.includes('data-remove-report-section'));
    assert.ok(saved.includes('Dashboard B'));
    assert.equal(await page.locator('[data-remove-report-section]').count(), 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
