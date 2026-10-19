import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, type Page } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import { createHtmlReport } from '../src/reports/html.report';
import { groupReportsByPosition } from '../src/utils/groupReports.utils';
import { aggregateOverallResults } from '../src/utils/overall-results.utils';
import type { IssueLink, PositionDefinition } from '../src/types/report.types';

const names = ['Posto <A> "PT" & $&', 'Posto B', 'Posto sem execuções'];

function fixture(kind: 'email' | 'html', empty = false, planOnly = false): string {
  const configured: PositionDefinition[] = empty
    ? []
    : names.map((name, index) => ({
        name,
        testPlanPrit: index < 2 || planOnly ? `PRIT-${100 + index}` : '',
        executions: {
          smoke: index < 2 ? [`PRIT-${index + 1}`] : [],
          regression: [],
          certification: [],
          defectFixing: [],
        },
      }));
  const defect = (prit: string, priority = 'High'): IssueLink => ({
    prit,
    titulo: `Defect ${prit}`,
    relation: 'created',
    priority,
    status: 'OPEN',
  });
  const positions = groupReportsByPosition(
    empty
      ? []
      : [0, 1].map((index) => ({
          prit: `PRIT-${index + 1}`,
          title: `Execução ${index + 1}`,
          mainStatus: index ? 'PAUSED' : 'OPEN',
          labels: [],
          totalTests: 1,
          executionStatuses: [{ status: 'PASS', quantidade: 1 }],
          issueLinks: [
            defect('PRIT-900'),
            defect(`PRIT-${901 + index}`, 'Highest'),
            defect(`PRIT-${910 + index}`, 'Medium'),
            defect(`PRIT-${920 + index}`, 'Low'),
            defect(`PRIT-${930 + index}`, 'Lowest'),
            defect(`PRIT-${940 + index}`, 'Unknown'),
          ],
        })),
    configured,
  );
  const links = {
    testPlans: configured.map((position) => ({
      position: position.name,
      prit: position.testPlanPrit,
    })),
    dashboardPageId: '123',
  };
  const overall = aggregateOverallResults(positions, links.testPlans, configured);
  return (kind === 'email' ? createEmailReport : createHtmlReport)(positions, links, overall);
}

async function visiblePositions(page: Page, selector: string, attribute: string) {
  return page
    .locator(`${selector}:visible`)
    .evaluateAll(
      (elements, name) => elements.map((element) => element.getAttribute(name)),
      attribute,
    );
}

async function checkSelection(page: Page, expected: string[], kind: 'email' | 'html') {
  for (const selector of [
    '[data-global-status-row]',
    '[data-overall-position]',
    '.position-block',
    '#release-links-table [data-report-position]',
    ...(kind === 'email' ? ['[data-activity-position]'] : []),
  ]) {
    assert.deepEqual(
      await visiblePositions(page, selector, 'data-report-position'),
      selector === '.position-block' ? expected.filter((name) => name !== names[2]) : expected,
    );
  }
  for (const selector of [
    '#global-status-section',
    '#overall-results-section',
    ...(kind === 'email' ? ['#position-activities-section'] : []),
  ]) {
    assert.equal(await page.locator(selector).isVisible(), expected.length > 0, selector);
  }
  assert.equal(await page.locator('.global-position-picker').isVisible(), true);
  assert.equal(await page.locator('[data-position-independent]').isVisible(), true);
}

type CopyWindow = typeof window & { copiedHtml: string; copiedText: string };

async function captureCopy(page: Page) {
  await page.evaluate(() => {
    document.execCommand = () => {
      const clipboardData = new DataTransfer();
      const event = new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true });
      document.dispatchEvent(event);
      (window as CopyWindow).copiedHtml = clipboardData.getData('text/html');
      (window as CopyWindow).copiedText = clipboardData.getData('text/plain');
      return event.defaultPrevented;
    };
  });
  const before = await page.locator('.email-container').evaluate((element) => element.outerHTML);
  await page.getByRole('button', { name: 'Copiar relatório para o e-mail' }).click();
  assert.match(await page.locator('#copy-email-status').innerText(), /Relatório copiado/);
  assert.equal(
    await page.locator('.email-container').evaluate((element) => element.outerHTML),
    before,
    'A cópia restaura os nós e os valores do editor',
  );
  return page.evaluate(() => ({
    html: (window as CopyWindow).copiedHtml,
    text: (window as CopyWindow).copiedText,
  }));
}

for (const kind of ['email', 'html'] as const) {
  test(`${kind}: seleção configura todas as áreas, persiste e omite secções vazias`, async () => {
    const browser = await chromium.launch({
      channel: process.platform === 'win32' ? 'msedge' : undefined,
      headless: true,
    });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.route('http://positions.test/**', (route) =>
        route.fulfill({ contentType: 'text/html', body: fixture(kind) }),
      );
      await page.goto(`http://positions.test/${kind}.html`);
      assert.deepEqual(
        await page
          .locator('[data-position-toggle]')
          .evaluateAll((toggles) => toggles.map((toggle) => (toggle as HTMLInputElement).value)),
        names,
      );
      assert.equal(await page.locator('[data-position-toggle]:checked').count(), 2);
      await checkSelection(page, names.slice(0, 2), kind);
      await page.evaluate((positions) => {
        const table = document.getElementById('global-status-table')!;
        const key = 't2d:global-status:v1:' + location.pathname + ':' + table.dataset.reportKey;
        localStorage.setItem(
          key,
          JSON.stringify(
            positions.map((position) => ({
              position,
              selected: true,
              status: 'completed',
              note: 'Nota anterior',
              installation: 'ok',
            })),
          ),
        );
      }, names);
      await page.reload();
      await checkSelection(page, names.slice(0, 2), kind);
      assert.equal(
        await page.getByLabel(`Nota de ${names[0]}`, { exact: true }).inputValue(),
        'Nota anterior',
      );
      assert.deepEqual(
        await page
          .locator(
            '#release-links-section, #overall-results-section, #main-blockers-section, #global-status-section',
          )
          .evaluateAll((elements) => elements.map((element) => element.id)),
        [
          'release-links-section',
          'overall-results-section',
          'main-blockers-section',
          'global-status-section',
        ],
      );
      await page
        .getByLabel(`Estado global de ${names[0]}`, { exact: true })
        .selectOption('completed');
      assert.equal(
        await page
          .locator('[data-global-status-row]')
          .first()
          .locator('[data-status-dot]')
          .isVisible(),
        false,
      );
      await page.getByLabel('Tema do bloqueador 1', { exact: true }).fill('Bloqueador preservado');
      await page.getByLabel(`Nota de ${names[0]}`, { exact: true }).fill('Nota preservada');
      await page
        .getByLabel(`Status de instalação de ${names[0]}`, { exact: true })
        .selectOption('ok');
      if (kind === 'email') {
        await page.getByLabel(`ON HOLD de ${names[0]}`, { exact: true }).fill('Aguardar validação');
      }

      await page.getByRole('checkbox', { name: names[1], exact: true }).uncheck();
      await checkSelection(page, [names[0]], kind);
      if (kind === 'email') {
        assert.equal(await page.locator('[data-sprint-defect="PRIT-902"]').isVisible(), false);
        assert.equal(await page.locator('[data-sprint-defect="PRIT-900"]').isVisible(), true);
        assert.equal(
          await page.locator('[data-sprint-defect="PRIT-900"] [data-defect-positions]').innerText(),
          names[0],
        );
        assert.equal(await page.locator('[data-other-activity-states]').isVisible(), false);
        assert.deepEqual(
          await page
            .locator('[data-sprint-defect]')
            .evaluateAll((rows) => rows.map((row) => row.getAttribute('data-sprint-defect'))),
          ['PRIT-901', 'PRIT-902', 'PRIT-900'],
        );
        const copy = await captureCopy(page);
        assert.ok(!copy.text.includes(names[1]));
        const preview = await browser.newPage();
        await preview.setContent(copy.html);
        assert.equal(
          await preview.locator('[hidden], input, select, textarea, [data-editor-only]').count(),
          0,
        );
        assert.deepEqual(
          await visiblePositions(preview, '.position-block', 'data-report-position'),
          [names[0]],
        );
        assert.equal(await preview.locator('[data-sprint-defect]').count(), 2);
        assert.equal(
          await preview
            .locator('[data-global-status-row]')
            .first()
            .locator('[data-status-dot]')
            .count(),
          0,
        );
        assert.match(
          await preview
            .locator('[data-global-status-row]')
            .first()
            .locator('td')
            .last()
            .innerText(),
          /^Concluído/,
        );
        assert.match(
          await preview.locator('#position-activities-section').innerText(),
          /Aguardar validação/,
        );
        await preview.close();
      }

      await page.reload();
      await checkSelection(page, [names[0]], kind);
      assert.equal(
        await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(),
        'Bloqueador preservado',
      );
      assert.equal(
        await page.getByLabel(`Nota de ${names[0]}`, { exact: true }).inputValue(),
        'Nota preservada',
      );
      assert.equal(
        await page.getByLabel(`Status de instalação de ${names[0]}`, { exact: true }).inputValue(),
        'ok',
      );
      await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
      await checkSelection(page, [], kind);
      if (kind === 'email') {
        assert.equal(await page.locator('#position-defects-section').isVisible(), false);
        const copy = await captureCopy(page);
        const preview = await browser.newPage();
        await preview.setContent(copy.html);
        assert.equal(
          await preview
            .locator(
              '#global-status-section, #overall-results-section, #position-activities-section, #position-defects-section, .position-block',
            )
            .count(),
          0,
        );
        assert.equal(await preview.locator('#main-blockers-section').count(), 1);
        assert.equal(await preview.locator('[data-position-independent]').count(), 1);
        await preview.close();
        for (const throws of [false, true]) {
          await page.evaluate((shouldThrow) => {
            document.execCommand = () => {
              if (shouldThrow) throw new Error('Clipboard unavailable');
              return false;
            };
          }, throws);
          const before = await page
            .locator('.email-container')
            .evaluate((element) => element.outerHTML);
          await page.getByRole('button', { name: 'Copiar relatório para o e-mail' }).click();
          assert.equal(
            await page.locator('.email-container').evaluate((element) => element.outerHTML),
            before,
          );
        }
      }
      await page.reload();
      await checkSelection(page, [], kind);
      // A seleção vazia mantém o controlo disponível, inclusive em ecrãs estreitos.
      await page.setViewportSize({ width: 390, height: 844 });
      await page.getByRole('button', { name: 'Selecionar todos', exact: true }).click();
      await checkSelection(page, names, kind);
      await page.getByRole('checkbox', { name: names[1], exact: true }).focus();
      await page.keyboard.press('Space');
      await checkSelection(page, [names[0], names[2]], kind);
      await page.emulateMedia({ media: 'print' });
      assert.equal(await page.locator('.global-position-picker').isVisible(), false);
      assert.deepEqual(await visiblePositions(page, '.position-block', 'data-report-position'), [
        names[0],
      ]);
      await page.emulateMedia({ media: 'screen' });
      await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
      await page.getByRole('checkbox', { name: names[2], exact: true }).check();
      await checkSelection(page, [names[2]], kind);
      if (kind === 'email')
        assert.equal(await page.locator('#position-defects-section').isVisible(), false);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });

  test(`${kind}: configuração vazia e armazenamento bloqueado não criam tabelas vazias`, async () => {
    const browser = await chromium.launch({
      channel: process.platform === 'win32' ? 'msedge' : undefined,
      headless: true,
    });
    try {
      const page = await browser.newPage();
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.addInitScript(() => {
        Storage.prototype.getItem = () => {
          throw new Error('Storage unavailable');
        };
        Storage.prototype.setItem = () => {
          throw new Error('Storage unavailable');
        };
      });
      let empty = true;
      let planOnly = false;
      await page.route('http://positions.test/**', (route) =>
        route.fulfill({ contentType: 'text/html', body: fixture(kind, empty, planOnly) }),
      );
      await page.goto(`http://positions.test/${kind}.html`);
      await checkSelection(page, [], kind);
      assert.equal(await page.locator('[data-position-toggle]').count(), 0);
      empty = false;
      await page.reload();
      await checkSelection(page, names.slice(0, 2), kind);
      await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
      await checkSelection(page, [], kind);
      await page.getByRole('button', { name: 'Selecionar todos', exact: true }).click();
      await checkSelection(page, names, kind);
      if (kind === 'email') await captureCopy(page);
      planOnly = true;
      await page.reload();
      await checkSelection(page, names, kind);
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
    }
  });
}
