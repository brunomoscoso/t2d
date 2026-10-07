import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import { createPositionDefectsSection } from '../src/reports/position-defects.report';
import type { IssueLink, PositionReport } from '../src/types/report.types';

const longText = 'ObservaçãoSemEspaços'.repeat(15);
const specialPosition = 'Local <novo> "A" & B $&';
const issue = (prit: string, titulo: string, priority = 'High', status = 'IN PROGRESS', relation = 'created'): IssueLink => ({
  prit, titulo, priority, status, relation,
});
const group = (position: string, issueLinks: IssueLink[]): PositionReport => ({
  position, reports: [{
    prit: `EXEC-${position}`, position, title: `[${position}] Smoke`, mainStatus: 'DONE', labels: [], totalTests: 1,
    executionStatuses: [{ status: 'PASS', quantidade: 1 }], issueLinks,
  }],
});

function fixture(): PositionReport[] {
  return [
    group('COCO PT', [
      issue('PRIT-8296', '[COCO][PT][SP]Error processing a prepaid fuel transaction'),
      issue('PRIT-8271', '[COCO][PT][TANGERINA][FROTA DIGITAL] Error refunding digital Fleet', 'Highest'),
      issue('PRIT-8306', '[COCO] [PT] - Tickets Integration - Decimal places issue', 'Medium', 'OPEN', ' Created '),
      issue('PRIT-8273', 'P23002 Retail 4.0 - PROD - Tickets Integration - Decimal places issue', 'Medium'),
      issue('PRIT-8200', '[Cyber][SP] Closed defect', 'Low', 'DONE'),
      issue('PRIT-8201', '[Cyber PT] - Resolved defect', 'Lowest', 'RESOLVED'),
      issue('PRIT-9000', '', 'Unknown', ''),
      issue('PRIT-8500', 'Defect without position tags'),
      issue('PRIT-8000', '[COCO PT] Defect antigo', 'Highest', 'OPEN', 'is blocked by'),
      issue('PRIT-8001', '[COCO PT] Não foi criado pela execução', 'Highest', 'OPEN', 'created by'),
      issue(' ', 'Sem chave'),
    ]),
    group('COCO SP', [issue(' prit-8296 ', '[COCO PT/SP]Error processing a prepaid fuel transaction')]),
    group('Tangerina', [issue('PRIT-8271', '[COCO PT and TANGERINA] Error refunding digital Fleet', 'Highest', 'IN PROGRESS', 'tests')]),
    group(specialPosition, [
      issue('PRIT-9001', '<img src=x onerror=alert(1)> & "nota" $&', 'Unknown', 'EM ANÁLISE'),
      issue('PRIT-8500', 'Defect without position tags', 'High', 'IN PROGRESS', 'tests'),
    ]),
    group('Lista extensa', Array.from({ length: 60 }, (_, index) =>
      issue(`GTR-${100 + index}`, longText, 'Medium', 'OPEN', index % 2 === 0 ? 'created' : 'tests'))),
  ];
}

test('lista apenas defects criados na sprint, com prioridade, PRIT único, postos, resumo e estado', async () => {
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const data = fixture();
    const originalData = structuredClone(data);
    await page.setContent(createEmailReport(data));
    assert.deepEqual(data, originalData, 'A agregação não modifica os dados extraídos');
    const section = page.locator('#position-defects-section');
    const rows = section.locator('[data-sprint-defect]');
    const row = (key: string) => rows.filter({ has: page.locator(`[data-position-defect="${key}"]`) });
    assert.equal(await rows.count(), 39);
    assert.deepEqual(await section.locator('thead th').allTextContents(), ['Prioridade', 'PRIT', 'Posto(s)', 'Resumo', 'Estado']);
    assert.equal(await section.locator('[data-defect-total], [data-defect-column], details, summary, button').count(), 0);
    assert.equal(await section.locator('[data-position-defect="PRIT-8000"], [data-position-defect="PRIT-8001"]').count(), 0);
    const keys = await section.locator('[data-position-defect]').allTextContents();
    assert.equal(new Set(keys).size, keys.length, 'Cada defect aparece uma única vez, mesmo partilhado por vários postos');
    assert.equal(keys[0], 'PRIT-8271');
    assert.deepEqual(keys.slice(-4), ['PRIT-8200', 'PRIT-8201', 'PRIT-9000', 'PRIT-9001']);
    assert.equal(await row('PRIT-8271').locator('[data-defect-priority]').innerText(), '● Crítica');
    assert.equal(await row('PRIT-8296').locator('[data-defect-priority]').innerText(), '● Alta');
    assert.equal(await row('PRIT-8306').locator('[data-defect-priority]').innerText(), '● Média');
    assert.equal(await row('PRIT-8271').locator('[data-defect-positions]').innerText(), 'COCO PT, Tangerina PT');
    assert.equal(await row('PRIT-8296').locator('[data-defect-positions]').innerText(), 'COCO PT, COCO SP');
    assert.equal(await row('PRIT-8273').locator('[data-defect-positions]').innerText(), 'PROD');
    assert.equal(await row('PRIT-8200').locator('[data-defect-positions]').innerText(), 'Cyber SP');
    assert.equal(await row('PRIT-8201').locator('[data-defect-positions]').innerText(), 'Cyber PT');
    assert.equal(await row('PRIT-8500').locator('[data-defect-positions]').innerText(), `COCO PT, ${specialPosition}`);
    assert.equal(await row('PRIT-8271').locator('[data-defect-summary]').innerText(), 'Error refunding digital Fleet');
    assert.equal(await row('PRIT-8306').locator('[data-defect-summary]').innerText(), 'Tickets Integration - Decimal places issue');
    assert.equal(await row('PRIT-8273').locator('[data-defect-summary]').innerText(), 'P23002 Retail 4.0 - Tickets Integration - Decimal places issue');
    assert.equal(await row('PRIT-8271').locator('[data-defect-status]').innerText(), 'In Progress');
    assert.equal(await row('PRIT-8306').locator('[data-defect-status]').innerText(), 'Open');
    assert.equal(await row('PRIT-8200').locator('[data-defect-status]').innerText(), 'Done');
    assert.equal(await row('PRIT-9000').locator('[data-defect-priority]').innerText(), '● Não definida');
    assert.equal(await row('PRIT-9000').locator('[data-defect-summary]').innerText(), 'Sem resumo');
    assert.equal(await row('PRIT-9000').locator('[data-defect-status]').innerText(), 'Sem estado');
    assert.equal(await row('PRIT-9001').locator('[data-defect-summary]').innerText(), '<img src=x onerror=alert(1)> & "nota" $&');
    assert.equal(await section.locator('img').count(), 0);
    assert.match((await row('PRIT-8271').locator('a').getAttribute('href'))!, /\/browse\/PRIT-8271$/);

    for (const width of [1920, 1100, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1080 });
      const layout = await section.evaluate(element => {
        const bounds = element.getBoundingClientRect();
        const table = element.querySelector('table')!;
        return {
          pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          tableFits: table.getBoundingClientRect().right <= bounds.right + 1 && table.scrollWidth <= table.clientWidth + 1,
        };
      });
      assert.ok(layout.pageFits && layout.tableFits, `${width}px: ${JSON.stringify(layout)}`);
    }

    await page.evaluate(() => {
      document.addEventListener('copy', event => {
        (window as typeof window & { copiedHtml: string }).copiedHtml = event.clipboardData!.getData('text/html');
        event.preventDefault();
      });
    });
    const preview = await browser.newPage({ viewport: { width: 390, height: 1080 } });
    for (const width of [320, 1920]) {
      await page.setViewportSize({ width, height: 1080 });
      const before = await page.locator('.email-container').evaluate(element => element.outerHTML);
      await page.locator('#copy-email-button').click();
      const copied = await page.evaluate(() => (window as typeof window & { copiedHtml: string }).copiedHtml);
      await preview.setContent(copied);
      const exported = preview.locator('#position-defects-section');
      assert.equal(await exported.locator('[data-sprint-defect]').count(), 39);
      assert.equal(await exported.locator('thead th').count(), 5);
      assert.deepEqual(await exported.locator('[data-position-defect]').allTextContents(), keys);
      assert.equal(await exported.locator('[data-sprint-defect="PRIT-8271"] [data-defect-summary]').innerText(), 'Error refunding digital Fleet');
      assert.equal(await exported.locator('[data-sprint-defect="PRIT-9001"] [data-defect-positions]').innerText(), specialPosition);
      assert.ok((await exported.innerText()).includes(longText));
      assert.equal(await exported.locator('img').count(), 0);
      assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), before);
    }
    const beforeFailure = await page.locator('.email-container').evaluate(element => element.outerHTML);
    for (const throws of [false, true]) {
      await page.evaluate(shouldThrow => {
        document.execCommand = () => { if (shouldThrow) throw new Error('Cópia bloqueada'); return false; };
      }, throws);
      await page.locator('#copy-email-button').click();
      assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), beforeFailure);
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('reconhece variantes de postos no título e preserva o texto do resumo', () => {
  for (const [title, expectedPositions, summary] of [
    ['[COCO SP/PT] - Falha no pagamento', 'COCO PT, COCO SP', 'Falha no pagamento'],
    ['[Tangerina n Coco PT/SP] - Falha no pagamento', 'COCO PT, COCO SP, Tangerina PT', 'Falha no pagamento'],
    ['[TANG][PT] -Retail 4.0: QA environment', 'Tangerina PT', 'Retail 4.0: QA environment'],
    ['[Cyber_SP] Falha', 'Cyber SP', 'Falha'],
    ['[Las-Rozas][PT] Falha', 'Las Rosas', 'Falha'],
    ['[PROD] Falha', 'PROD', 'Falha'],
  ]) {
    const html = createPositionDefectsSection([group('Exploratory Testing', [issue('PRIT-1', title)])]);
    assert.ok(html.includes(`>${expectedPositions}</td>`), title);
    assert.ok(html.includes(`>${summary}</td>`), title);
  }
});

test('omite a tabela quando não há defects criados na sprint', () => {
  assert.equal(createPositionDefectsSection([]), '');
  assert.equal(createPositionDefectsSection([group('COCO PT', [])]), '');
  assert.equal(createPositionDefectsSection([group('COCO PT', [
    issue('PRIT-1', 'Antigo', 'High', 'OPEN', 'tests'),
    issue('PRIT-2', 'Antigo', 'High', 'OPEN', 'created by'),
  ])]), '');
});
