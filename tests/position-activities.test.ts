import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import type { PositionReport, Report } from '../src/types/report.types';

function task(prit: string, mainStatus: string, title: string): Report {
  return {
    prit, mainStatus, title, position: 'COCO PT', labels: [], totalTests: 1,
    executionStatuses: [{ status: 'PASS', quantidade: 1 }],
    issueLinks: [{ prit: 'GTR-1', status: 'OPEN', titulo: 'Defect associado', relation: 'created', priority: 'High' }],
  };
}

function fixture(): PositionReport[] {
  const smoke = task('PRIT-1', 'done', '[Passport v1][COCO][PT] Installation Smoke Tests');
  return [
    { position: 'COCO PT', reports: [
      smoke,
      task('PRIT-2', ' IN_PROGRESS ', '[Passport v1] [COCO][PT] - Regression Group "2"'),
      task('PRIT-3', 'OPEN', '[COCO][PT] Certification Group "0" - Only Pricing Catalog'),
      task('PRIT-4', 'TO DO', '[COCO][PT] Validation Defect Fixing / SAFT File'),
      task('PRIT-5', 'ON HOLD', '[COCO][PT] Validação suspensa'),
      task('PRIT-6', '', '[COCO][PT] Atividade sem status'),
    ] },
    { position: 'Marinas', reports: [] },
    { position: 'Local <novo> & "A" $&', reports: [task('PRIT-7', 'IN REVIEW', '<img src=x onerror=alert(1)> & análise')] },
    { position: 'COCO PT', reports: [smoke] },
  ];
}

test('acrescenta a tabela de atividades e guarda/copia a última coluna editável sem alterar os quadros existentes', async () => {
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let html = createEmailReport(fixture());
    await page.route('http://activities.test/**', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('http://activities.test/email.html');
    const table = page.locator('#position-activities-table');
    assert.deepEqual(await table.locator('thead th').allTextContents(), ['Postos', 'DONE', 'IN PROGRESS', 'TO DO', 'ON HOLD']);
    assert.equal(await table.locator('tbody tr').count(), 3);
    assert.deepEqual(await page.locator('#global-status-table thead th').allTextContents(), ['Postos', 'Status de instalação', 'Estado Global']);
    assert.equal(await page.locator('#position-defects-table [data-sprint-defect]').count(), 1);
    assert.ok(await page.evaluate(() => {
      const ids = ['global-status-section', 'position-activities-section', 'position-defects-section'];
      return ids.slice(1).every((id, index) => Boolean(document.getElementById(ids[index])!
        .compareDocumentPosition(document.getElementById(id)!) & Node.DOCUMENT_POSITION_FOLLOWING));
    }));
    const first = table.locator('[data-activity-position="COCO PT"]');
    for (const [column, keys] of Object.entries({ done: ['PRIT-1'], 'in-progress': ['PRIT-2'], 'to-do': ['PRIT-3', 'PRIT-4'] })) {
      assert.deepEqual(await first.locator(`[data-activity-column="${column}"] [data-position-activity]`).evaluateAll(nodes =>
        nodes.map(node => node.getAttribute('data-position-activity'))), keys);
    }
    assert.equal(await first.locator('[data-position-activity="PRIT-1"] a').textContent(), 'Smoke');
    assert.match(await first.locator('[data-position-activity="PRIT-2"]').innerText(), /Regressão Grupo 2.*PRIT-2/);
    assert.match(await first.locator('[data-position-activity="PRIT-3"]').innerText(), /Certificação Grupo 0 - Only Pricing Catalog/);
    assert.match((await first.locator('[data-position-activity="PRIT-1"] a').getAttribute('title'))!, /Passport v1/);
    assert.equal(await page.locator('#position-activities-section [data-position-activity]').count(), 7, 'Todas as atividades aparecem uma vez por posto');
    assert.match(await page.locator('[data-other-activity-states]').innerText(), /ON HOLD/);
    assert.match(await page.locator('[data-other-activity-states]').innerText(), /Sem status/);
    assert.equal(await table.locator('img').count(), 0, 'Os títulos são texto escapado');
    assert.equal(await table.locator('input, select, [contenteditable]').count(), 0);
    assert.equal(await table.locator('textarea').count(), 3);
    assert.equal(await first.locator('td').last().locator('textarea').count(), 1);

    await page.getByRole('checkbox', { name: 'COCO PT', exact: true }).check();
    await page.getByLabel('Estado global de COCO PT', { exact: true }).selectOption('completed');
    await page.getByLabel('Nota de COCO PT', { exact: true }).fill('Nota do estado global');
    const note = 'A aguardar TPA\n\nValidar <img src=x onerror=alert(1)> & "certificação" $&';
    await page.getByLabel('ON HOLD de COCO PT', { exact: true }).fill(note);
    await page.reload();
    assert.equal(await page.getByLabel('ON HOLD de COCO PT', { exact: true }).inputValue(), note);
    assert.equal(await page.getByLabel('Nota de COCO PT', { exact: true }).inputValue(), 'Nota do estado global');
    assert.equal(await page.getByLabel('Estado global de COCO PT', { exact: true }).inputValue(), 'completed');
    assert.equal(await page.getByLabel('ON HOLD de Marinas', { exact: true }).inputValue(), '');

    await page.evaluate(() => {
      document.addEventListener('copy', event => {
        const container = document.createElement('div');
        container.appendChild(window.getSelection()!.getRangeAt(0).cloneContents());
        (window as typeof window & { copiedActivities: string }).copiedActivities = container.innerHTML;
        event.preventDefault();
      });
    });
    const preview = await browser.newPage();
    for (const width of [1920, 390, 320]) {
      await page.setViewportSize({ width, height: 1080 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
      assert.ok(await table.locator('textarea').evaluateAll(notes => notes.every(note => {
        const box = note.getBoundingClientRect(), cell = note.closest('td')!.getBoundingClientRect();
        return box.left >= cell.left && box.right <= cell.right && note.scrollHeight <= note.clientHeight + 1;
      })));
      const before = await page.locator('.email-container').evaluate(element => element.outerHTML);
      await page.locator('#copy-email-button').click();
      const copied = await page.evaluate(() => (window as typeof window & { copiedActivities: string }).copiedActivities);
      await preview.setContent(copied);
      assert.equal(await preview.locator('textarea, input, select, [contenteditable], [data-editor-only]').count(), 0);
      const exported = preview.locator('#position-activities-table');
      assert.equal(await exported.locator('thead th').count(), 5);
      assert.equal(await exported.locator('[data-position-activity]').count(), 5);
      const exportedNote = exported.locator('[data-activity-position="COCO PT"] td').last();
      assert.equal(await exportedNote.locator('br').count(), 2);
      assert.match(await exportedNote.innerText(), /Validar <img src=x onerror=alert\(1\)> & "certificação" \$&/);
      assert.equal(await exportedNote.locator('img').count(), 0);
      assert.equal(await exported.locator('[data-activity-position="Marinas"] td').last().locator('div').textContent(), '\u00a0');
      assert.equal(await preview.locator('#global-status-table').count(), 1);
      assert.equal(await preview.locator('#position-defects-section [data-sprint-defect]').count(), 1);
      assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), before);
      assert.equal(await page.getByLabel('ON HOLD de COCO PT', { exact: true }).inputValue(), note);
    }
    const beforeFailure = await page.locator('.email-container').evaluate(element => element.outerHTML);
    for (const throws of [false, true]) {
      await page.evaluate(shouldThrow => {
        document.execCommand = () => { if (shouldThrow) throw new Error('Cópia bloqueada'); return false; };
      }, throws);
      await page.locator('#copy-email-button').click();
      assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), beforeFailure);
    }
    await page.getByLabel('ON HOLD de COCO PT', { exact: true }).fill('Depois de copiar');
    await page.reload();
    assert.equal(await page.getByLabel('ON HOLD de COCO PT', { exact: true }).inputValue(), 'Depois de copiar');

    const otherReport = fixture();
    otherReport[0].reports[0].prit = 'PRIT-99';
    html = createEmailReport(otherReport);
    await page.reload();
    assert.equal(await page.getByLabel('ON HOLD de COCO PT', { exact: true }).inputValue(), '', 'Outro conjunto de atividades usa notas independentes');
    await page.evaluate(() => {
      const table = document.getElementById('position-activities-table')!;
      localStorage.setItem('t2d:position-activities:v1:' + location.pathname + ':' + table.dataset.reportKey, '{invalid');
    });
    await page.reload();
    await page.getByLabel('ON HOLD de COCO PT', { exact: true }).fill('Armazenamento recuperado');
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Indisponível'); } });
    });
    await page.reload();
    await page.getByLabel('ON HOLD de COCO PT', { exact: true }).fill('Funciona sem armazenamento');
    assert.equal(await page.getByLabel('ON HOLD de COCO PT', { exact: true }).inputValue(), 'Funciona sem armazenamento');
    assert.deepEqual(errors, []);

    html = createEmailReport([]);
    await page.reload();
    assert.match(await table.innerText(), /Nenhuma atividade extraída/);
    assert.equal(await table.locator('textarea').count(), 0);
  } finally {
    await browser.close();
  }
});
