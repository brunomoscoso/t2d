import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import type { IssueLink, PositionReport, Report } from '../src/types/report.types';

const longText = 'ObservaçãoSemEspaços'.repeat(15);
const specialPosition = 'Local <novo> "A" & B $&';
const issue = (prit: string, status: string, titulo = 'Falha no pagamento'): IssueLink => ({
  prit, status, titulo, relation: 'is blocked by', priority: 'High',
});
const report = (prit: string, position: string, issueLinks: IssueLink[]): Report => ({
  prit, position, title: `[${position}] Smoke`, mainStatus: 'DONE', labels: [], totalTests: 1,
  executionStatuses: [{ status: 'PASS', quantidade: 1 }], issueLinks,
});

function fixture(): PositionReport[] {
  return [
    { position: 'COCO PT', reports: [
      report('PRIT-101', 'COCO PT', [
        issue('GTR-1', 'OPEN'), issue('PRIT-2', 'BLOCKED'), issue('GTR-3', 'TO DO'), issue('GTR-4', 'REOPENED'),
        issue('GTR-5', 'IN PROGRESS'), issue('GTR-6', 'Ready for Quality'), issue('GTR-7', 'Done'), issue('GTR-8', 'CLOSED'),
      ]),
      report('PRIT-102', 'COCO PT', [issue(' gtr-1 ', ' open '), issue('GTR-6', 'READY_FOR_QUALITY')]),
    ] },
    { position: specialPosition, reports: [report('PRIT-103', specialPosition, [
      issue('GTR-1', 'OPEN', '<img src=x onerror=alert(1)> & "nota" $&'),
      issue('GTR-9', 'EM ANÁLISE', longText), issue('GTR-10', ''),
      issue('GTR-11', 'OPEN'), issue('GTR-11', 'DONE'),
    ])] },
    { position: 'Sem defects', reports: [report('PRIT-104', 'Sem defects', [])] },
    { position: 'Lista extensa', reports: [report('PRIT-105', 'Lista extensa',
      Array.from({ length: 60 }, (_, index) => issue(`GTR-${100 + index}`, 'IN PROGRESS', longText)))] },
    { position: 'Concluídos', reports: [report('PRIT-106', 'Concluídos', [issue('GTR-200', 'RESOLVED')])] },
    { position: 'COCO PT', reports: [report('PRIT-107', 'COCO PT', [issue('GTR-8', 'closed')])] },
  ];
}

test('exibe os códigos dos defects por posto numa tabela responsiva, sem títulos e sem listas recolhidas', async () => {
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(createEmailReport(fixture()));
    const section = page.locator('#position-defects-section');
    const rows = section.locator('[data-defect-position]');
    assert.equal(await rows.count(), 4, 'Só os postos com associações têm linha');
    assert.deepEqual(await section.locator('thead th').allTextContents(), ['Postos', 'Defects', 'Total']);
    assert.equal(await section.locator('details, summary, button').count(), 0, 'Os códigos ficam expostos sem expandir controlos');
    assert.deepEqual(await rows.locator('th').allTextContents(), ['COCO PT', specialPosition, 'Lista extensa', 'Concluídos']);
    assert.ok(await page.evaluate(() => {
      const section = document.getElementById('position-defects-section')!;
      const global = document.getElementById('global-status-section')!;
      const details = document.querySelector('.position-block')!;
      return Boolean(global.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING)
        && Boolean(section.compareDocumentPosition(details) & Node.DOCUMENT_POSITION_FOLLOWING);
    }));
    const first = rows.nth(0);
    assert.equal(await first.locator('[data-defect-total]').textContent(), '8');
    for (const [group, count] of Object.entries({ open: '4', ongoing: '2', done: '2' })) {
      assert.equal(await first.locator(`[data-defect-count="${group}"] strong`).textContent(), count);
    }
    assert.equal(await first.locator('[data-defect-count="other"]').count(), 0);
    assert.equal(await rows.nth(1).locator('[data-defect-count="other"] strong').textContent(), '3');
    assert.equal(await first.locator('[data-position-defect="GTR-1"]').count(), 1);
    assert.equal(await section.locator('[data-position-defect="GTR-1"]').count(), 2, 'Uma associação partilhada pertence aos dois postos');

    assert.equal(await first.locator('[data-position-defect="PRIT-2"]').innerText(), 'PRIT-2');
    assert.equal(await rows.nth(1).locator('img').count(), 0);
    assert.equal(await rows.nth(1).locator('[data-position-defect="GTR-1"]').innerText(), 'GTR-1');
    assert.ok(!(await section.innerHTML()).includes('onerror=alert'));
    assert.ok(!(await section.innerHTML()).includes(longText), 'Os títulos são omitidos também do HTML copiado');
    assert.ok(!(await section.innerText()).includes('Falha no pagamento'));
    assert.match((await rows.nth(1).locator('[data-position-defect="GTR-11"]').getAttribute('title'))!, /ESTADOS DIVERGENTES/);
    assert.match((await first.locator('[data-position-defect="GTR-1"]').getAttribute('href'))!, /\/browse\/GTR-1$/);
    assert.equal(await section.locator('[data-position-defect]').count(), 73);
    assert.ok(await section.locator('[data-position-defect="GTR-159"]').isVisible(), 'Até o último código da lista extensa está exposto');

    for (const width of [1920, 1440, 1100, 1099, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1080 });
      const layout = await section.evaluate(element => {
        const root = document.querySelector('.email-container')!.getBoundingClientRect();
        const bounds = element.getBoundingClientRect();
        const table = element.querySelector('#position-defects-table')!.getBoundingClientRect();
        return {
          pageFits: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
          aligned: Math.abs(bounds.left - root.left) < 2 && Math.abs(bounds.right - root.right) < 2,
          tableFits: table.left >= bounds.left && table.right <= bounds.right + 1,
          codesFit: Array.from(element.querySelectorAll('[data-position-defect]')).every(code => {
            const box = code.getBoundingClientRect();
            const cell = code.closest('td')!.getBoundingClientRect();
            return box.width > 0 && box.height > 0 && box.left >= cell.left && box.right <= cell.right + 1;
          }),
        };
      });
      assert.ok(layout.pageFits && layout.aligned && layout.tableFits && layout.codesFit, `${width}px: ${JSON.stringify(layout)}`);
    }

    await page.evaluate(() => {
      document.addEventListener('copy', event => {
        const container = document.createElement('div');
        container.appendChild(window.getSelection()!.getRangeAt(0).cloneContents());
        (window as typeof window & { copiedHtml: string }).copiedHtml = container.innerHTML;
        event.preventDefault();
      });
    });
    const preview = await browser.newPage();
    // Todos os códigos são copiados em janelas largas ou estreitas.
    for (const width of [320, 1920]) {
      await page.setViewportSize({ width, height: 1080 });
      const before = await page.locator('.email-container').evaluate(element => element.outerHTML);
      await page.locator('#copy-email-button').click();
      const copied = await page.evaluate(() => (window as typeof window & { copiedHtml: string }).copiedHtml);
      await preview.setContent(copied);
      const exported = preview.locator('#position-defects-section');
      assert.equal(await exported.locator('[data-defect-position]').count(), 4);
      assert.equal(await exported.locator('[data-position-defect]').count(), 73, 'Inclui todos os 60 defects da lista extensa');
      assert.equal(await exported.locator('details, summary, [tabindex]').count(), 0);
      assert.equal(await exported.locator('thead th').count(), 3);
      assert.ok(!(await exported.innerHTML()).includes(longText));
      assert.equal(await exported.locator('[data-position-defect="PRIT-2"]').innerText(), 'PRIT-2');
      assert.equal(await exported.locator('[data-defect-total]').first().textContent(), '8');
      assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), before);
    }

    const beforeFailure = await page.locator('.email-container').evaluate(element => element.outerHTML);
    for (const throws of [false, true]) {
      await page.evaluate(shouldThrow => {
        document.execCommand = () => {
          if (shouldThrow) throw new Error('Cópia bloqueada');
          return false;
        };
      }, throws);
      await page.locator('#copy-email-button').click();
      assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), beforeFailure);
    }
    assert.ok(await first.locator('[data-position-defect="GTR-1"]').isVisible());
    assert.deepEqual(errors, []);

    await page.setContent(createEmailReport([{ position: 'Sem defects', reports: [] }]));
    assert.equal(await page.locator('#position-defects-section').count(), 0);
    assert.equal(await page.locator('#global-status-table').count(), 1, 'O quadro de Estado Global permanece disponível');
  } finally {
    await browser.close();
  }
});
