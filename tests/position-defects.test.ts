import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import type { IssueLink, PositionReport, Report } from '../src/types/report.types';

const longText = 'ObservaçãoSemEspaços'.repeat(15);
const specialPosition = 'Local <novo> "A" & B $&';
const issue = (prit: string, status: string, titulo = 'Falha no pagamento', relation = 'is blocked by'): IssueLink => ({
  prit, status, titulo, relation, priority: 'High',
});
const report = (prit: string, position: string, issueLinks: IssueLink[]): Report => ({
  prit, position, title: `[${position}] Smoke`, mainStatus: 'DONE', labels: [], totalTests: 1,
  executionStatuses: [{ status: 'PASS', quantidade: 1 }], issueLinks,
});

function fixture(): PositionReport[] {
  return [
    { position: 'COCO PT', reports: [
      report('PRIT-101', 'COCO PT', [
        issue('GTR-1', 'OPEN'), issue('PRIT-2', 'BLOCKED', undefined, 'created'),
        issue('GTR-3', 'TO DO', undefined, ' Created '), issue('GTR-4', 'REOPENED', undefined, 'created by'),
        issue('GTR-5', 'IN PROGRESS', undefined, 'tests'), issue('GTR-6', 'Ready for Quality', undefined, 'relates to'),
        issue('GTR-7', 'Done', undefined, 'created'), issue('GTR-8', 'CLOSED', undefined, 'CREATED'),
      ]),
      report('PRIT-102', 'COCO PT', [
        issue(' gtr-1 ', ' open ', undefined, 'created'), issue('GTR-6', 'READY_FOR_QUALITY'), issue('PRIT-2', 'BLOCKED'),
      ]),
    ] },
    { position: specialPosition, reports: [report('PRIT-103', specialPosition, [
      issue('GTR-1', 'OPEN', '<img src=x onerror=alert(1)> & "nota" $&'),
      issue('GTR-9', 'EM ANÁLISE', longText), issue('GTR-10', '', undefined, ''),
      issue('GTR-11', 'OPEN', undefined, 'created'), issue('GTR-11', 'DONE'),
    ])] },
    { position: 'Sem defects', reports: [report('PRIT-104', 'Sem defects', [])] },
    { position: 'Lista extensa', reports: [report('PRIT-105', 'Lista extensa',
      Array.from({ length: 60 }, (_, index) => issue(`GTR-${100 + index}`, 'IN PROGRESS', longText, index % 2 === 0 ? 'created' : 'tests')))] },
    { position: 'Concluídos', reports: [report('PRIT-106', 'Concluídos', [issue('GTR-200', 'RESOLVED', undefined, 'created')])] },
    { position: 'COCO PT', reports: [report('PRIT-107', 'COCO PT', [issue('GTR-8', 'closed')])] },
  ];
}

test('separa defects por categoria created, sem status, com total único e cópia responsiva', async () => {
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setContent(createEmailReport(fixture()));
    const section = page.locator('#position-defects-section');
    const rows = section.locator('[data-defect-position]');
    assert.equal(await rows.count(), 4, 'Só os postos com associações têm linha');
    assert.deepEqual(await section.locator('thead th').allTextContents(), ['Postos', 'Criados na sprint', 'Demais defects', 'Total']);
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
    assert.deepEqual(await first.locator('[data-defect-column="created"] a').allTextContents(), ['GTR-1', 'GTR-3', 'GTR-7', 'GTR-8', 'PRIT-2']);
    assert.deepEqual(await first.locator('[data-defect-column="other"] a').allTextContents(), ['GTR-4', 'GTR-5', 'GTR-6']);
    assert.equal(await section.locator('[data-defect-count], [data-defect-group], [data-position-defect][title]').count(), 0);
    assert.deepEqual(await rows.nth(1).locator('[data-defect-column="created"] a').allTextContents(), ['GTR-11']);
    assert.deepEqual(await rows.nth(1).locator('[data-defect-column="other"] a').allTextContents(), ['GTR-1', 'GTR-9', 'GTR-10']);
    assert.equal(await rows.nth(2).locator('[data-defect-column="created"] a').count(), 30);
    assert.equal(await rows.nth(2).locator('[data-defect-column="other"] a').count(), 30);
    assert.equal((await rows.nth(3).locator('[data-defect-column="other"]').innerText()).trim(), '—');
    for (const row of await rows.all()) {
      const keys = await row.locator('[data-position-defect]').allTextContents();
      assert.equal(new Set(keys).size, keys.length, 'Um defect aparece numa única coluna por posto');
      assert.equal(Number(await row.locator('[data-defect-total]').textContent()), keys.length);
    }
    assert.equal(await first.locator('[data-position-defect="GTR-1"]').count(), 1);
    assert.equal(await section.locator('[data-position-defect="GTR-1"]').count(), 2, 'Uma associação partilhada pertence aos dois postos');

    assert.equal(await first.locator('[data-position-defect="PRIT-2"]').innerText(), 'PRIT-2');
    assert.equal(await rows.nth(1).locator('img').count(), 0);
    assert.equal(await rows.nth(1).locator('[data-position-defect="GTR-1"]').innerText(), 'GTR-1');
    assert.ok(!(await section.innerHTML()).includes('onerror=alert'));
    assert.ok(!(await section.innerHTML()).includes(longText), 'Os títulos são omitidos também do HTML copiado');
    assert.ok(!(await section.innerText()).includes('Falha no pagamento'));
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
      assert.equal(await exported.locator('thead th').count(), 4);
      assert.equal(await exported.locator('[data-defect-position]').first().locator('[data-defect-column="created"] a').count(), 5);
      assert.equal(await exported.locator('[data-defect-position]').first().locator('[data-defect-column="other"] a').count(), 3);
      assert.equal(await exported.locator('[data-defect-count], [data-defect-group], [data-position-defect][title]').count(), 0);
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
