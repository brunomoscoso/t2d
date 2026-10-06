import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import { createHtmlReport } from '../src/reports/html.report';
import { createDashboardEmailHtml, createDashboardHtml } from '../src/reports/dashboard.report';
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
      relation: 'is blocked by', prit: 'GTR-1001', titulo: longText,
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
    for (const format of ['email', 'report']) {
      const html = format === 'email'
        ? createEmailReport(positions).replace('<!-- DASHBOARD -->', () => createDashboardEmailHtml(dashboard))
        : createHtmlReport(positions).replace('</body>', () => createDashboardHtml(dashboard) + '</body>');
      await page.setContent(html);
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
            isEmail ? '#observations, #global-status-table, .position-block, .dashboard-block' : '.position-block, .dashboard-block',
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
              dashboardCells: fragment.querySelectorAll('.dashboard-table tbody td').length,
              defects: fragment.querySelectorAll('.jira-issues-table tr').length,
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
        assert.equal(copied.dashboardCells, 7);
        assert.equal(copied.defects, 1);
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
