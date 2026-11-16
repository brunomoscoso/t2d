import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import { createHtmlReport } from '../src/reports/html.report';
import { sortReportPositions } from '../src/reports/position-order.report';
import type { PositionReport } from '../src/types/report.types';

const expected = [
  'COCO PT',
  'Tangerina',
  'COCO SP',
  'Reseller',
  'Marinas',
  'Arco do Cego',
  'Olivais',
  'Las Rosas',
  'Badajoz',
  'OPT PT',
  'Automação',
];
function fixture(): PositionReport[] {
  return [...expected].reverse().map((position, index) => ({
    position,
    fixVersions: [`Version ${position}`],
    testPlanPrit: '',
    reports: [
      {
        position,
        testType: 'smoke',
        prit: `PRIT-${index + 1}`,
        title: `Teste de ${position}`,
        mainStatus: 'OPEN',
        totalTests: 0,
        executionStatuses: [],
        issueLinks: [],
      },
    ],
  }));
}

test('ordem das posições mantém entradas intactas e reconhece aliases', () => {
  const positions = fixture();
  assert.deepEqual(
    sortReportPositions(positions).map((p) => p.position),
    expected,
  );
  assert.equal(positions[0].position, 'Automação');
  const aliases = ['Automacao', 'Badajoz', 'Las Rozas', 'Resseller', ' coco pt '].map(
    (position) => ({ position, reports: [], testPlanPrit: '' }),
  );
  assert.deepEqual(
    sortReportPositions(aliases).map((p) => p.position),
    [' coco pt ', 'Resseller', 'Las Rozas', 'Badajoz', 'Automacao'],
  );
});

test('reordena blocos completos, persiste, restaura e exporta sem controlos', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    for (const [kind, render] of [
      ['email', createEmailReport],
      ['html', createHtmlReport],
    ] as const) {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route(`http://position-order.test/${kind}`, (route) =>
        route.fulfill({
          contentType: 'text/html',
          body: render(fixture(), undefined, { plans: [] }),
        }),
      );
      await page.goto(`http://position-order.test/${kind}`);
      assert.deepEqual(errors, []);
      await page.locator('[data-select-all-positions]').click();
      const order = () =>
        page
          .locator('.position-block')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-report-position')));
      assert.deepEqual(await order(), expected);
      assert.deepEqual(
        await page
          .locator('[data-global-status-row]')
          .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-position'))),
        expected,
      );
      for (const name of expected) {
        assert.equal(
          await page.getByLabel('Versão instalada de ' + name, { exact: true }).inputValue(),
          'Version ' + name,
        );
      }
      const handle = page.getByRole('button', { name: 'Arrastar Tangerina', exact: true });
      await handle.scrollIntoViewIfNeeded();
      const source = (await handle.boundingBox())!;
      await page.mouse.move(source.x + 10, source.y + 10);
      await page.mouse.down();
      await page.mouse.move(source.x + 25, source.y + 10, { steps: 5 });
      const target = page.locator('.position-block').first().locator(':scope > div').first();
      await target.scrollIntoViewIfNeeded();
      const destination = (await target.boundingBox())!;
      await page.mouse.move(destination.x + 40, destination.y + 15, { steps: 5 });
      await page.mouse.move(destination.x + 41, destination.y + 16);
      await page.mouse.up();
      const moved = ['Tangerina', 'COCO PT', ...expected.slice(2)];
      assert.deepEqual(await order(), moved);
      assert.match(await page.locator('.position-block').first().innerText(), /Teste de Tangerina/);
      assert.equal(
        await page.getByRole('button', { name: 'Descer OPT PT', exact: true }).isDisabled(),
        true,
      );
      assert.equal(
        await page.getByRole('button', { name: 'Subir Automação', exact: true }).isDisabled(),
        true,
      );
      await page.reload();
      assert.deepEqual(await order(), moved);
      if (kind === 'email') {
        await page.evaluate(() => {
          document.execCommand = () => {
            const clipboardData = new DataTransfer();
            document.dispatchEvent(
              new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true }),
            );
            (window as any).copied = clipboardData.getData('text/html');
            return true;
          };
        });
        await page.locator('#copy-email-button').click();
        const preview = await browser.newPage();
        async function checkExport(html: string) {
          await preview.setContent(html);
          assert.deepEqual(
            await preview
              .locator('.position-block')
              .evaluateAll((nodes) =>
                nodes.map((node) => node.getAttribute('data-report-position')),
              ),
            moved,
          );
          assert.equal(
            await preview.locator('[data-position-up], [data-position-down]').count(),
            0,
          );
        }
        await checkExport(await page.evaluate(() => (window as any).copied));
        const pending = page.waitForEvent('download');
        await page.locator('#download-report-button').click();
        const stream = await (await pending).createReadStream();
        const chunks: Buffer[] = [];
        for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
        await checkExport(Buffer.concat(chunks).toString('utf8'));
        await preview.close();
        assert.deepEqual(await order(), moved);
      }
      await page.getByRole('button', { name: 'Restaurar ordem das posições', exact: true }).click();
      assert.deepEqual(await order(), expected);
      await page.locator('[data-position-toggle][value="Tangerina"]').uncheck();
      await page.getByRole('button', { name: 'Descer COCO PT', exact: true }).click();
      assert.deepEqual(
        await page
          .locator('.position-block:visible')
          .evaluateAll((nodes) =>
            nodes.slice(0, 2).map((node) => node.getAttribute('data-report-position')),
          ),
        ['COCO SP', 'COCO PT'],
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
  } finally {
    await browser.close();
  }
});
