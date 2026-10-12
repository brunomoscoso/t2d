import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import { createHtmlReport } from '../src/reports/html.report';
import { createDashboardEmailHtml, createDashboardHtml } from '../src/reports/dashboard.report';
import { TEST_PLANS, DASHBOARD_PAGE_ID } from '../src/config/operations.config';
import type { DashboardData, PositionReport } from '../src/types/report.types';

const longText = 'ReferênciaSemEspaços'.repeat(12);
const positions: PositionReport[] = [{
  position: 'COCO PT',
  reports: [{
    prit: 'PRIT-1234',
    title: `[COCO PT] Certification ${longText}`,
    mainStatus: 'IN PROGRESS',
    labels: [],
    position: 'COCO PT',
    totalTests: 90,
    executionStatuses: ['PASS', 'FAIL', 'EXECUTING', 'TODO', 'ABORTED', 'FOR TESTING', 'PENDING 3RD', 'BLOCKED']
      .map(status => ({ status, quantidade: 10 })),
    issueLinks: [{
      relation: 'created', prit: 'GTR-1001', titulo: longText,
      status: 'IN PROGRESS', priority: 'High',
    }],
  }],
}];

const dashboard: DashboardData = {
  pageId: '1', rawTitle: 'Certification Open Defects', title: 'Certification Open Defects',
  total: 1,
  defects: [{
    issueType: 'Defect', priority: 'High', key: 'GTR-1001', summary: longText,
    status: 'IN PROGRESS', assignee: longText, created: '06/10/2026',
  }],
};

test('aproveita a largura da página e mantém quadros alinhados sem deslocamento horizontal da página', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true,
  });

  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    const releaseLinks = {
      testPlans: {
        ...TEST_PLANS,
        smokes: { ...TEST_PLANS.smokes, executionPrits: ['PRIT-1234'] },
      },
      dashboardPageId: DASHBOARD_PAGE_ID,
    };
    for (const format of ['email', 'report']) {
      const html = format === 'email'
        ? createEmailReport(positions, releaseLinks).replace('<!-- DASHBOARD -->', () => createDashboardEmailHtml(dashboard))
        : createHtmlReport(positions, releaseLinks).replace('</body>', () => createDashboardHtml(dashboard) + '</body>');
      await page.setContent(html);
      await page.locator('[data-test-plan-toggle][value="smokes"]').check();
      if (format === 'email') {
        await page.getByRole('checkbox', { name: 'COCO PT', exact: true }).check();
        await page.getByRole('checkbox', { name: 'VMPOS - ALGRAGIDE', exact: true }).check();
      }

      for (const width of [1920, 1440, 1100, 1099, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        const layout = await page.evaluate(isEmail => {
          const root = document.querySelector(isEmail ? '.email-container' : '.page')!;
          const bounds = root.getBoundingClientRect();
          const padding = parseFloat(getComputedStyle(document.body).paddingLeft);
          const picker = document.querySelector('.global-position-picker');
          const pickerBounds = picker?.getBoundingClientRect();
          const sectionBounds = document.getElementById('global-status-section')?.getBoundingClientRect();
          const blocks = Array.from(document.querySelectorAll(
            isEmail ? '#observations, #global-status-table, #overall-results-section, #position-activities-scroll, #position-defects-section, .position-block, .dashboard-block' : '#overall-results-section, .position-block, .dashboard-block',
          ));
          return {
            pageWidth: document.documentElement.clientWidth,
            contentWidth: document.documentElement.scrollWidth,
            left: bounds.left, right: bounds.right, width: bounds.width, padding,
            blocksAligned: blocks.every(block => {
              const box = block.getBoundingClientRect();
              return Math.abs(box.left - bounds.left) < 2 && Math.abs(box.right - bounds.right) < 2;
            }),
            pickerRight: pickerBounds?.right,
            pickerBeside: pickerBounds && pickerBounds.left >= bounds.right,
            pickerAligned: pickerBounds && sectionBounds && Math.abs(pickerBounds.top - sectionBounds.top) < 2,
            pickerStacked: picker && getComputedStyle(picker).position === 'static',
            localScrollAvailable: Array.from(document.querySelectorAll('.report-table-scroll')).some(element =>
              element.scrollWidth > element.clientWidth && getComputedStyle(element).overflowX === 'auto'),
            fieldsInside: Array.from(document.querySelectorAll('[data-global-status-row]:not([hidden]) input, [data-global-status-row]:not([hidden]) select'))
              .every(element => {
                const box = element.getBoundingClientRect();
                return box.left >= bounds.left && box.right <= bounds.right + 1;
              }),
          };
        }, format === 'email');
        const context = `${format} em ${width}px: ${JSON.stringify(layout)}`;
        assert.ok(layout.contentWidth <= layout.pageWidth + 1, context);
        assert.ok(Math.abs(layout.left - layout.padding) < 2, context);
        assert.ok(layout.blocksAligned, context);
        assert.ok(layout.fieldsInside, context);
        if (format === 'email' && width >= 1100) {
          assert.ok(layout.pickerBeside && layout.pickerAligned, context);
          assert.ok(Math.abs(layout.pickerRight! - (layout.pageWidth - layout.padding)) < 2, context);
        } else {
          assert.ok(Math.abs(layout.right - (layout.pageWidth - layout.padding)) < 2, context);
          if (format === 'email') assert.ok(layout.pickerStacked, context);
        }
        if (width <= 390) assert.ok(layout.localScrollAvailable, context);
      }

      if (format === 'email') {
        // A cópia de uma janela estreita continua a conter todas as colunas.
        await page.evaluate(() => {
          document.addEventListener('copy', event => {
            const fragment = window.getSelection()!.getRangeAt(0).cloneContents();
            (window as typeof window & { copiedTables: unknown }).copiedTables = {
              wrappers: fragment.querySelectorAll('.report-table-scroll').length,
              toolbar: fragment.querySelectorAll('.report-toolbar, #copy-email-button, #copy-email-status').length,
              dashboardCells: fragment.querySelectorAll('.dashboard-table tbody td').length,
              defects: fragment.querySelectorAll('.jira-issues-table tr').length,
              activityColumns: fragment.querySelectorAll('#position-activities-table thead th').length,
              activityEditors: fragment.querySelectorAll('[data-activity-note]').length,
              executionText: fragment.querySelector('.execution-summary-table')?.textContent,
              text: fragment.textContent,
            };
            event.preventDefault();
          });
        });
        const before = await page.locator('.email-container').evaluate(element => element.outerHTML);
        await page.locator('#copy-email-button').click();
        const copied = await page.evaluate(() =>
          (window as typeof window & { copiedTables: Record<string, unknown> }).copiedTables);
        assert.equal(copied.wrappers, 0);
        assert.equal(copied.toolbar, 0);
        assert.equal(copied.dashboardCells, 7);
        assert.equal(copied.defects, 1);
        assert.equal(copied.activityColumns, 6);
        assert.equal(copied.activityEditors, 0);
        assert.ok(String(copied.executionText).includes('PENDING 3RD'));
        assert.ok(String(copied.text).includes(longText));
        assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), before);
        await page.evaluate(() => { document.execCommand = () => false; });
        await page.locator('#copy-email-button').click();
        assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), before);
      }
    }
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('copia HTML fluido e mantém todas as colunas dentro de um editor de email estreito', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true,
  });
  try {
    const page = await browser.newPage();
    const preview = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
    const data = structuredClone(positions);
    data[0].reports[0].issueLinks = Array.from({ length: 60 }, (_, index) => ({
      ...positions[0].reports[0].issueLinks[0],
      prit: `GTR-${1000 + index}`, relation: index % 2 ? 'created' : 'is blocked by',
    }));
    await page.setContent(createEmailReport(data));
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await page.getByRole('checkbox', { name: 'Cyber', exact: true }).count(), 0);
    for (const name of ['COCO PT', 'Cyber SP', 'Cyber PT']) {
      await page.getByRole('checkbox', { name, exact: true }).check();
    }
    await page.getByLabel('Estado global de COCO PT', { exact: true }).selectOption('completed');
    await page.getByLabel('Nota de COCO PT', { exact: true }).fill('Estado preservado');
    await page.getByLabel('ON HOLD de COCO PT', { exact: true }).fill(`A aguardar\n${longText}`);
    await page.locator('#observations').fill('Comentário antes da cópia');
    const statusColor = await page.locator('[data-status-dot]').first().evaluate(element => getComputedStyle(element).color);
    await page.evaluate(() => {
      // Captura os formatos enviados ao clipboard, sem usar o clipboard partilhado
      // pelos outros testes. O payload deve funcionar sem o CSS da página original.
      document.execCommand = command => {
        if (command !== 'copy') return false;
        const clipboardData = new DataTransfer();
        const event = new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true });
        document.dispatchEvent(event);
        (window as typeof window & { emailClipboard: unknown }).emailClipboard = {
          html: clipboardData.getData('text/html'), text: clipboardData.getData('text/plain'),
        };
        return event.defaultPrevented;
      };
    });
    for (const sourceWidth of [1920, 320]) {
      await page.setViewportSize({ width: sourceWidth, height: 1000 });
      const before = await page.locator('.email-container').evaluate(element => element.outerHTML);
      await page.locator('#copy-email-button').click();
      const copied = await page.evaluate(() =>
        (window as typeof window & { emailClipboard: { html: string; text: string } }).emailClipboard);
      assert.match(copied.text, /Comentário antes da cópia/);
      assert.match(copied.text, /Estado preservado/);
      assert.match(copied.text, /GTR-1059/);
      assert.ok(copied.text.includes(longText));
      assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), before);

      await preview.setContent('<div id="email-editor" contenteditable="true"></div>');
      await preview.locator('#email-editor').evaluate((editor, html) => { editor.innerHTML = html; }, copied.html);
      assert.equal(await preview.locator('style, script, textarea, input, select, [data-editor-only]').count(), 0);
      assert.equal(await preview.locator('#position-activities-table thead th').count(), 6);
      assert.deepEqual(await preview.locator('#position-defects-table thead th').allTextContents(),
        ['Prioridade', 'PRIT', 'Posto(s)', 'Resumo', 'Estado']);
      assert.equal(await preview.locator('#position-defects-table [data-position-defect]').count(), 30);
      assert.equal(await preview.locator('#position-defects-table [data-position-defect="GTR-1000"]').count(), 0);
      assert.match(await preview.locator('#observations').innerText(), /Comentário antes da cópia/);
      assert.equal(await preview.locator('[data-status-dot]').first().evaluate(element => getComputedStyle(element).color), statusColor);

      for (const destinationWidth of [800, 600, 390, 320]) {
        const layout = await preview.locator('#email-editor').evaluate((editor, width) => {
          (editor as HTMLElement).style.width = `${width}px`;
          const bounds = editor.getBoundingClientRect();
          const tables = Array.from(editor.querySelectorAll('#position-activities-table, #position-defects-table'));
          return {
            fits: tables.every(table => table.scrollWidth <= table.clientWidth + 1),
            tables: tables.map(table => {
              const box = table.getBoundingClientRect();
              return {
                fits: box.left >= bounds.left && box.right <= bounds.right + 1,
                textFits: Array.from(table.querySelectorAll('th, td')).every(cell => {
                  const cellBounds = cell.getBoundingClientRect();
                  const walker = document.createTreeWalker(cell, NodeFilter.SHOW_TEXT);
                  let node;
                  while ((node = walker.nextNode())) {
                    if (!node.textContent?.trim()) continue;
                    const range = document.createRange();
                    range.selectNodeContents(node);
                    if (Array.from(range.getClientRects()).some(rect =>
                      rect.left < cellBounds.left - 1 || rect.right > cellBounds.right + 1)) return false;
                  }
                  return true;
                }),
              };
            }),
          };
        }, destinationWidth);
        assert.ok(layout.fits && layout.tables.every(table => table.fits && table.textFits),
          `Cópia de ${sourceWidth}px para editor de ${destinationWidth}px: ${JSON.stringify(layout)}`);
      }
    }
  } finally {
    await browser.close();
  }
});
