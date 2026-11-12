import assert from 'node:assert/strict';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { chromium, type Page } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import { createHtmlReport } from '../src/reports/html.report';
import { groupReportsByPosition } from '../src/utils/groupReports.utils';
import { aggregateOverallResults } from '../src/utils/overall-results.utils';
import type { IssueLink, PositionDefinition } from '../src/types/report.types';
import { POSITIONS } from '../src/config/positions.config';

const names = ['Posto <A> "PT" & $&', 'Posto B', 'Posto sem execuções'];

test('OPT PT e OPT SP estão disponíveis no seletor dos dois relatórios', () => {
  const positions = groupReportsByPosition([], POSITIONS);
  const overall = aggregateOverallResults(positions, [], POSITIONS);
  for (const render of [createEmailReport, createHtmlReport]) {
    const html = render(positions, undefined, overall);
    assert.match(html, /data-position-toggle[^>]*value="OPT PT"/);
    assert.match(html, /data-position-toggle[^>]*value="OPT SP"/);
    assert.ok(!html.includes('Atividades por posto'));
  }
});

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
  ]) {
    assert.deepEqual(
      await visiblePositions(page, selector, 'data-report-position'),
      selector === '.position-block' ? expected.filter((name) => name !== names[2]) : expected,
    );
  }
  for (const selector of ['#global-status-section', '#overall-results-section']) {
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

test('remove só a tabela de resultados, preserva a posição e permite restaurar', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route('http://remove-table.test/**', (route) =>
      route.fulfill({ contentType: 'text/html; charset=utf-8', body: fixture('email') }),
    );
    await page.goto('http://remove-table.test/report.html');
    const table = page.locator('[data-overall-position]').first();
    await table.locator('[data-remove-overall]').click();
    assert.equal(await table.isVisible(), false);
    assert.equal(
      await page.getByRole('checkbox', { name: names[0], exact: true }).isChecked(),
      true,
    );
    assert.equal(await page.locator('[data-global-status-row]').first().isVisible(), true);
    assert.equal(
      await page.locator('#release-links-table [data-report-position]').first().isVisible(),
      true,
    );
    assert.equal(await page.locator('.position-block').first().isVisible(), true);
    await page.getByRole('button', { name: 'Selecionar todos', exact: true }).click();
    assert.equal(await table.isVisible(), false);
    await page.reload();
    assert.equal(await table.isVisible(), false);
    const copy = await captureCopy(page);
    const preview = await browser.newPage();
    await preview.setContent(copy.html);
    assert.ok(
      !(
        await visiblePositions(preview, '[data-overall-position]', 'data-report-position')
      ).includes(names[0]),
    );
    assert.ok(
      (
        await visiblePositions(preview, '[data-global-status-row]', 'data-report-position')
      ).includes(names[0]),
    );
    assert.equal(await preview.locator('[data-remove-overall]').count(), 0);
    await page.getByRole('button', { name: 'Restaurar tabelas removidas' }).click();
    assert.equal(await table.isVisible(), true);
    await page.reload();
    assert.equal(await table.isVisible(), true);
  } finally {
    await browser.close();
  }
});

test('download abre offline apenas com os postos selecionados e valores editados', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('http://download.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: fixture('email').replace(
          '<!-- DASHBOARD -->',
          '<section id="dashboard-test">Dashboard completo</section>',
        ),
      }),
    );
    // Em Lisboa já é dia 20, embora ainda seja dia 19 em UTC.
    await page.clock.setFixedTime(new Date('2026-10-19T23:30:00Z'));
    await page.goto('http://download.test/email.html');
    assert.equal(
      await page.locator('#observations').innerText(),
      'Boa tarde,\nSegue o ponto de situação Diário das execuções dos testes para o “Test Plan P23002 - Retail 4.0 - Certification for Passport X (versão não informada) (Ambiente Qualidade)”.',
    );
    assert.equal(
      await page.locator('#observations strong').innerText(),
      'Test Plan P23002 - Retail 4.0 - Certification for Passport X (versão não informada) (Ambiente Qualidade)',
    );
    assert.deepEqual(await page.locator('#global-status-table thead th').allTextContents(), [
      'Postos',
      'Status de instalação',
    ]);
    assert.equal(await page.locator('[data-status-select], [data-status-note]').count(), 0);
    await page.locator('#observations').fill('Observações com acentos & <texto>');
    await page
      .getByLabel(`Status de instalação de ${names[0]}`, { exact: true })
      .selectOption('ok');
    await page
      .getByLabel(`Versão instalada de ${names[0]}`, { exact: true })
      .fill('2.4.1 <QA> & build');
    await page.getByLabel('Tema do bloqueador 1', { exact: true }).fill('Falha & <detalhes>');
    await page
      .getByLabel('Impacto do bloqueador 1', { exact: true })
      .fill('Primeira linha\nSegunda linha');
    await page.getByRole('button', { name: 'Adicionar bloqueador', exact: true }).click();
    await page.getByLabel('Tema do bloqueador 2', { exact: true }).fill('Segundo bloqueador');
    await page.getByRole('checkbox', { name: names[1], exact: true }).uncheck();
    let before = await page.locator('.email-container').evaluate((element) => element.outerHTML);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Baixar relatório completo' }).click();
    const download = await downloadPromise;
    assert.equal(download.suggestedFilename(), 'P23002 - Retail 4.0 - 2026-10-20.html');
    const downloadedPath = await download.path();
    assert.ok(downloadedPath);
    assert.equal(
      await page.locator('.email-container').evaluate((element) => element.outerHTML),
      before,
    );
    assert.equal(await page.locator('[data-position-toggle]:checked').count(), 1);

    const context = await browser.newContext({ offline: true });
    const saved = await context.newPage();
    saved.on('pageerror', (error) => errors.push(error.message));
    const htmlPath = downloadedPath + '.html';
    await download.saveAs(htmlPath);
    await saved.goto(pathToFileURL(htmlPath).href);
    assert.deepEqual(
      await visiblePositions(saved, '[data-global-status-row]', 'data-report-position'),
      [names[0]],
    );
    assert.deepEqual(await visiblePositions(saved, '.position-block', 'data-report-position'), [
      names[0],
    ]);
    assert.equal(
      await saved.locator('#observations').innerText(),
      'Observações com acentos & <texto>',
    );
    assert.match(await saved.locator('[data-global-status-row]').first().innerText(), /OK/);
    assert.match(
      await saved.locator('[data-global-status-row]').first().innerText(),
      /Versão: 2\.4\.1 <QA> & build/,
    );
    assert.match(
      await saved.locator('#main-blockers-section').innerText(),
      /Falha & <detalhes>.*Primeira linha\nSegunda linha.*Segundo bloqueador/s,
    );
    assert.equal(
      await saved.locator('[data-sprint-defect="PRIT-900"] [data-defect-positions]').innerText(),
      names[0],
    );
    assert.equal(await saved.locator('[data-sprint-defect]').count(), 2);
    assert.equal(await saved.locator('[data-sprint-defect="PRIT-902"]').count(), 0);
    for (const selector of [
      '[data-overall-position]',
      '#release-links-table [data-report-position]',
    ]) {
      assert.deepEqual(await visiblePositions(saved, selector, 'data-report-position'), [names[0]]);
    }
    assert.ok(!(await saved.locator('body').innerText()).includes(names[1]));
    assert.ok(!(await saved.locator('body').innerText()).includes(names[2]));
    assert.equal(await saved.locator('#dashboard-test').innerText(), 'Dashboard completo');
    assert.equal(await saved.locator('#overall-results-section').isVisible(), true);
    assert.equal(await saved.locator('#release-links-section').isVisible(), true);
    assert.equal(
      await saved
        .locator(
          'script, input, select, textarea, [contenteditable], [data-editor-only], #position-activities-section',
        )
        .count(),
      0,
    );
    assert.equal(await saved.locator('head style').count(), 1);
    await saved.reload();
    assert.match(await saved.locator('#main-blockers-section').innerText(), /Segundo bloqueador/);

    // Um relatório aberto no dia anterior usa a data atual no próximo download.
    await page.clock.setFixedTime(new Date('2026-10-20T23:30:00Z'));
    // Cada download reflete a seleção no momento do clique, inclusive a seleção vazia.
    for (const selected of [[names[1]], []]) {
      await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
      for (const name of selected) {
        await page.getByRole('checkbox', { name, exact: true }).check();
      }
      before = await page.locator('.email-container').evaluate((element) => element.outerHTML);
      const nextDownloadPromise = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Baixar relatório completo' }).click();
      const nextDownload = await nextDownloadPromise;
      assert.equal(nextDownload.suggestedFilename(), 'P23002 - Retail 4.0 - 2026-10-21.html');
      const nextPath = (await nextDownload.path()) + '.html';
      await nextDownload.saveAs(nextPath);
      await saved.goto(pathToFileURL(nextPath).href);
      for (const selector of [
        '[data-global-status-row]',
        '.position-block',
        '[data-overall-position]',
        '#release-links-table [data-report-position]',
      ]) {
        assert.deepEqual(await visiblePositions(saved, selector, 'data-report-position'), selected);
      }
      assert.equal(await saved.locator('[data-sprint-defect]').count(), selected.length ? 2 : 0);
      if (selected.length) {
        assert.equal(
          await saved
            .locator('[data-sprint-defect="PRIT-900"] [data-defect-positions]')
            .innerText(),
          names[1],
        );
      } else {
        assert.equal(
          await saved
            .locator('#global-status-section, #overall-results-section, #position-defects-section')
            .count(),
          0,
        );
      }
      assert.equal(
        await saved.locator('#observations').innerText(),
        'Observações com acentos & <texto>',
      );
      assert.match(await saved.locator('#main-blockers-section').innerText(), /Segundo bloqueador/);
      assert.equal(await saved.locator('#dashboard-test').innerText(), 'Dashboard completo');
      assert.equal(
        await page.locator('.email-container').evaluate((element) => element.outerHTML),
        before,
      );
    }
    await context.close();

    await page.evaluate(() => {
      URL.createObjectURL = () => {
        throw new Error('Download indisponível');
      };
    });
    await page.getByRole('button', { name: 'Baixar relatório completo' }).click();
    assert.match(await page.locator('#copy-email-status').innerText(), /Não foi possível baixar/);
    assert.equal(
      await page.locator('.email-container').evaluate((element) => element.outerHTML),
      before,
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

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
      const version = page.getByLabel(`Versão instalada de ${names[0]}`, { exact: true });
      assert.equal(await version.inputValue(), '', 'Dados anteriores sem versão continuam válidos');
      await version.fill('3.2.0-rc1');
      const selectBox = await page
        .getByLabel(`Status de instalação de ${names[0]}`, { exact: true })
        .boundingBox();
      const versionBox = await version.boundingBox();
      assert.ok(selectBox && versionBox);
      assert.ok(selectBox.width <= 70, 'O seletor de instalação é compacto');
      assert.ok(versionBox.width >= 90, 'A versão tem espaço para digitação');
      assert.ok(versionBox.x >= selectBox.x + selectBox.width, 'A versão fica ao lado do seletor');
      assert.ok(Math.abs(versionBox.y - selectBox.y) < 2);
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
      await page.getByLabel('Tema do bloqueador 1', { exact: true }).fill('Bloqueador preservado');
      await page
        .getByLabel(`Status de instalação de ${names[0]}`, { exact: true })
        .selectOption('ok');
      assert.equal(await page.locator('#position-activities-section').count(), 0);

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
        assert.match(copy.text, /Versão: 3\.2\.0-rc1/);
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
        assert.match(
          await preview
            .locator('[data-global-status-row]')
            .first()
            .locator('td')
            .last()
            .innerText(),
          /^OK/,
        );
        assert.equal(await preview.locator('#position-activities-section').count(), 0);
        await preview.close();
      }

      await page.reload();
      await checkSelection(page, [names[0]], kind);
      assert.equal(await version.inputValue(), '3.2.0-rc1');
      assert.equal(
        await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(),
        'Bloqueador preservado',
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
      const mobileVersionBox = await version.boundingBox();
      const mobileCellBox = await version.locator('..').locator('..').boundingBox();
      assert.ok(mobileVersionBox && mobileCellBox);
      assert.ok(mobileVersionBox.x >= mobileCellBox.x);
      assert.ok(
        mobileVersionBox.x + mobileVersionBox.width <= mobileCellBox.x + mobileCellBox.width + 1,
      );
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
