import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, type Page } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import { POSITIONS } from '../src/config/positions.config';
import type { PositionReport } from '../src/types/report.types';

function fixture(): PositionReport[] {
  return ['COCO PT', 'COCO SP', 'Marinas', 'Local <novo> "A" & B $&'].map((position, index) => ({
    position,
    reports: [
      {
        prit: `PRIT-${index + 1}`,
        title: `[${position}] Certification`,
        mainStatus: 'OPEN',
        labels: [],
        position,
        totalTests: 10,
        executionStatuses: [{ status: 'PASS', quantidade: 10 }],
        issueLinks: [],
      },
    ],
  }));
}

async function selectPositions(page: Page, names = fixture().map((position) => position.position)) {
  for (const name of names) {
    await page.getByRole('checkbox', { name, exact: true }).check();
  }
}

test('disponibiliza o catálogo sem dados do Jira, migra estados guardados e omite uma seleção vazia na cópia', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('http://report.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: createEmailReport([]),
      }),
    );
    await page.goto('http://report.test/email.html');
    assert.equal(
      await page.locator('#global-status-section').getByRole('checkbox').count(),
      POSITIONS.length,
    );
    assert.equal(await page.locator('[data-global-status-row]:visible').count(), 0);
    assert.equal(
      await page.locator('#global-status-table').isVisible(),
      true,
      'O quadro continua visível sem postos selecionados',
    );
    assert.equal(await page.locator('#global-status-empty').isVisible(), true);
    assert.deepEqual(await page.locator('#global-status-table thead th').allTextContents(), [
      'Postos',
      'Status de instalação',
    ]);

    await page.evaluate(() => {
      const table = document.getElementById('global-status-table')!;
      const key = 't2d:global-status:v1:' + location.pathname + ':' + table.dataset.reportKey;
      // Formato anterior: sem a propriedade selected.
      localStorage.setItem(
        key,
        JSON.stringify([
          { position: 'COCO PT', installation: 'ok', installationVersion: 'Observação anterior' },
        ]),
      );
    });
    await page.reload();
    assert.equal(
      await page.getByRole('checkbox', { name: 'COCO PT', exact: true }).isChecked(),
      true,
    );
    assert.equal(await page.locator('[data-global-status-row]:visible').count(), 1);
    assert.equal(
      await page.locator('#global-status-empty').isVisible(),
      false,
      'A seleção substitui a linha de orientação',
    );
    assert.equal(
      await page.getByLabel('Status de instalação de COCO PT', { exact: true }).inputValue(),
      'ok',
    );
    assert.equal(
      await page.getByLabel('Versão instalada de COCO PT', { exact: true }).inputValue(),
      'Observação anterior',
    );
    await page.getByRole('checkbox', { name: 'COCO PT', exact: true }).uncheck();
    await page.reload();
    assert.equal(await page.locator('[data-global-status-row]:visible').count(), 0);
    assert.equal(
      await page.locator('#global-status-empty').isVisible(),
      true,
      'Limpar a seleção recupera a linha de orientação',
    );

    await page.evaluate(() => {
      document.addEventListener('copy', (event) => {
        const fragment = window.getSelection()!.getRangeAt(0).cloneContents();
        (window as typeof window & { emptySelectionCopy: unknown }).emptySelectionCopy = {
          sectionCount: fragment.querySelectorAll('#global-status-section').length,
          controlsCount: fragment.querySelectorAll('input, select, button, [data-editor-only]')
            .length,
          text: fragment.textContent,
        };
        event.preventDefault();
      });
    });
    const before = await page.locator('.email-container').evaluate((element) => element.outerHTML);
    await page.locator('#copy-email-button').click();
    const copied = await page.evaluate(
      () =>
        (window as typeof window & { emptySelectionCopy: Record<string, unknown> })
          .emptySelectionCopy,
    );
    assert.equal(copied.sectionCount, 0);
    assert.equal(copied.controlsCount, 0);
    assert.ok(String(copied.text).includes('Cumprimentos'));
    assert.ok(!String(copied.text).includes('Observação anterior'));
    assert.ok(!String(copied.text).includes('Posto a selecionar'));
    assert.equal(
      await page.locator('.email-container').evaluate((element) => element.outerHTML),
      before,
    );

    await page.evaluate(() => {
      document.execCommand = () => false;
    });
    await page.locator('#copy-email-button').click();
    assert.equal(
      await page.locator('.email-container').evaluate((element) => element.outerHTML),
      before,
    );
    await selectPositions(page, ['COCO PT']);
    assert.equal(
      await page.getByLabel('Versão instalada de COCO PT', { exact: true }).inputValue(),
      'Observação anterior',
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('mantém conteúdo copiável nas observações vazias e restaura a caixa após copiar', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setContent(createEmailReport(fixture()));
    await selectPositions(page, ['COCO PT']);
    await page.locator('[data-installation-select]').first().selectOption('ok');
    await page.locator('[data-installation-version]').first().fill('Nota do posto');
    await page.evaluate(() => {
      document.addEventListener('copy', (event) => {
        const fragment = window.getSelection()!.getRangeAt(0).cloneContents();
        const observations = fragment.querySelector('#observations')!;
        (window as typeof window & { observationCopy: unknown }).observationCopy = {
          html: observations.innerHTML,
          text: observations.textContent,
          editable: observations.hasAttribute('contenteditable'),
          placeholder: observations.hasAttribute('data-placeholder'),
          height: document.getElementById('observations')!.getBoundingClientRect().height,
          statusText: fragment.querySelector('[data-global-status-row]')!.textContent,
        };
        event.preventDefault();
      });
    });

    const observations = page.locator('#observations');
    for (const html of [
      '',
      '  \n\t ',
      '<br>',
      '<div><br></div>',
      '<p><br></p>',
      '&nbsp;',
      '\u200b',
    ]) {
      await observations.evaluate((element, content) => {
        element.innerHTML = content;
      }, html);
      const before = await observations.evaluate((element) => ({
        html: element.outerHTML,
        height: element.getBoundingClientRect().height,
      }));

      await page.locator('#copy-email-button').click();
      const copied = await page.evaluate(
        () =>
          (window as typeof window & { observationCopy: Record<string, unknown> }).observationCopy,
      );
      assert.equal(
        copied.text,
        '\u00a0',
        `Observações vazias (${JSON.stringify(html)}) devem conter um espaço não separável na cópia`,
      );
      assert.equal(copied.html, '&nbsp;');
      assert.equal(copied.editable, false);
      assert.equal(copied.placeholder, false);
      assert.equal(copied.height, before.height);
      assert.ok(String(copied.statusText).includes('OK'));
      assert.ok(String(copied.statusText).includes('Nota do posto'));
      assert.equal(await observations.evaluate((element) => element.outerHTML), before.html);
      assert.ok(
        (await page.locator('#copy-email-status').innerText()).includes('Relatório copiado'),
      );
    }

    // Não substitui texto formatado, imagens ou tabelas por um espaço.
    for (const html of [
      '<strong>Em validação</strong><br>Segunda linha',
      '<img alt="Diagrama">',
      '<table><tbody><tr><td><br></td></tr></tbody></table>',
    ]) {
      await observations.evaluate((element, content) => {
        element.innerHTML = content;
      }, html);
      await page.locator('#copy-email-button').click();
      const copied = await page.evaluate(
        () =>
          (window as typeof window & { observationCopy: Record<string, unknown> }).observationCopy,
      );
      assert.equal(copied.html, html);
      assert.equal(await observations.innerHTML(), html);
    }

    await observations.fill('');
    const emptyHtml = await observations.innerHTML();
    for (const throws of [false, true]) {
      await page.evaluate((shouldThrow) => {
        document.execCommand = () => {
          if (shouldThrow) throw new Error('Cópia bloqueada');
          return false;
        };
      }, throws);
      await page.locator('#copy-email-button').click();
      assert.equal(
        await observations.innerHTML(),
        emptyHtml,
        'Os nós originais são restaurados se a cópia falhar',
      );
      assert.equal(await observations.textContent(), '', 'O espaço temporário não fica na caixa');
      assert.equal(await observations.getAttribute('contenteditable'), 'true');
      assert.ok(await observations.getAttribute('data-placeholder'));
      assert.equal(
        await page.locator('#copy-email-status').innerText(),
        'Não foi possível copiar o relatório.',
      );
    }
  } finally {
    await browser.close();
  }
});

test('edita, guarda e copia os estados globais no relatório de e-mail', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let html = createEmailReport(fixture());
    await page.route('http://report.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: html }),
    );
    await page.goto('http://report.test/email.html');

    const rows = page.locator('[data-global-status-row]:visible');
    const selects = rows.locator('[data-installation-select]');
    const notes = rows.locator('[data-installation-version]');
    const dots = rows.locator('[data-installation-dot]');
    assert.equal(await rows.count(), 0, 'Primeiro escolhe os postos, depois define os estados');
    assert.equal(await page.locator('#global-status-empty').isVisible(), true);
    const catalog = [...POSITIONS.map((position) => position.name), fixture()[3].position];
    assert.deepEqual(
      await page
        .locator('[data-position-toggle]')
        .evaluateAll((toggles) => toggles.map((toggle) => (toggle as HTMLInputElement).value)),
      catalog,
    );

    await page.getByRole('button', { name: 'Selecionar todos', exact: true }).click();
    assert.equal(await rows.count(), catalog.length);
    await page.getByRole('button', { name: 'Limpar seleção', exact: true }).click();
    assert.equal(await rows.count(), 0);

    // Um posto sem dados do Jira pode ser incluído; desmarcar não apaga o rascunho.
    await selectPositions(page, ['Olivais']);
    await page.getByLabel('Status de instalação de Olivais', { exact: true }).selectOption('nok');
    await page
      .getByLabel('Versão instalada de Olivais', { exact: true })
      .fill('Versão instalada de posto não selecionado');
    await page.getByRole('checkbox', { name: 'Olivais', exact: true }).uncheck();
    await page.reload();
    assert.equal(await rows.count(), 0, 'Uma seleção vazia também é guardada');
    await selectPositions(page, ['Olivais']);
    assert.equal(
      await page.getByLabel('Status de instalação de Olivais', { exact: true }).inputValue(),
      'nok',
    );
    assert.equal(
      await page.getByLabel('Versão instalada de Olivais', { exact: true }).inputValue(),
      'Versão instalada de posto não selecionado',
    );
    await page.getByRole('checkbox', { name: 'Olivais', exact: true }).uncheck();

    await selectPositions(page);
    assert.equal(await rows.count(), 4);
    assert.deepEqual(
      (await rows.locator('th').allTextContents()).map((text) => text.trim()),
      fixture().map((item) => item.position),
    );
    assert.ok(
      await page.evaluate(() => {
        const observations = document.getElementById('observations')!;
        const table = document.getElementById('global-status-table')!;
        const firstPrit = document.querySelector('a[href*="/browse/PRIT-"]')!;
        return (
          Boolean(observations.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          Boolean(table.compareDocumentPosition(firstPrit) & Node.DOCUMENT_POSITION_FOLLOWING)
        );
      }),
    );
    assert.equal(await selects.nth(0).inputValue(), '');

    const chosen = ['ok', 'ok', 'nok'];
    const colors = ['rgb(34, 160, 107)', 'rgb(34, 160, 107)', 'rgb(222, 53, 11)'];
    for (let index = 0; index < chosen.length; index++) {
      await selects.nth(index).selectOption(chosen[index]);
      assert.equal(
        await dots.nth(index).evaluate((element) => getComputedStyle(element).color),
        colors[index],
      );
    }
    const note = 'TPA pendente <img src=x onerror=alert(1)> & "certificação"';
    await notes.nth(1).fill(note);
    assert.equal(await notes.nth(0).inputValue(), '');
    assert.equal(await notes.nth(1).getAttribute('maxlength'), '100');

    await page.reload();
    for (let index = 0; index < chosen.length; index++) {
      assert.equal(await selects.nth(index).inputValue(), chosen[index]);
      assert.equal(
        await dots.nth(index).evaluate((element) => getComputedStyle(element).color),
        colors[index],
      );
    }
    assert.equal(await notes.nth(1).inputValue(), note);
    await page.locator('#observations').fill('Observação geral de teste.');
    const reportBeforeCopy = await page
      .locator('.email-container')
      .evaluate((element) => element.outerHTML);
    const reportWidth = await page
      .locator('.email-container')
      .evaluate((element) => element.getBoundingClientRect().width);

    // Inspeciona a seleção real, antes da serialização nativa do navegador, sem alterar o clipboard.
    await page.evaluate(() => {
      document.addEventListener('copy', (event) => {
        const report = document.querySelector('.email-container')!;
        const range = window.getSelection()!.getRangeAt(0);
        const observations = report.querySelector('#observations');
        const intro = report.querySelector('.intro-text') || report;
        const contents = document.createElement('div');
        contents.appendChild(range.cloneContents());
        (window as typeof window & { copiedHtml: string }).copiedHtml = contents.innerHTML;
        (window as typeof window & { copyLayout: unknown }).copyLayout = {
          originalReportSelected: range.commonAncestorContainer === report,
          reportCount: document.querySelectorAll('.email-container').length,
          width: report.getBoundingClientRect().width,
          left: report.getBoundingClientRect().left,
          fontFamily: getComputedStyle(intro).fontFamily,
          fontSize: getComputedStyle(intro).fontSize,
          observationsPadding: observations && getComputedStyle(observations).paddingTop,
          observationsBorder: observations && getComputedStyle(observations).borderTopWidth,
          observationTitleWeight: getComputedStyle(report.querySelector('.observation-title')!)
            .fontWeight,
          signatureMargin: getComputedStyle(report.querySelector('.signature')!).marginTop,
        };
        event.preventDefault();
      });
    });
    await page.locator('#copy-email-button').click();
    const copiedHtml = await page.evaluate(
      () => (window as typeof window & { copiedHtml: string }).copiedHtml,
    );
    assert.ok(copiedHtml, 'O botão deve copiar uma seleção de HTML');
    assert.ok((await page.locator('#copy-email-status').innerText()).includes('Relatório copiado'));
    assert.equal(await selects.count(), 4, 'Os campos originais continuam editáveis');
    assert.equal(await notes.nth(1).inputValue(), note);
    assert.equal(
      await page.locator('.email-container').evaluate((element) => element.outerHTML),
      reportBeforeCopy,
    );
    const layout = await page.evaluate(
      () => (window as typeof window & { copyLayout: Record<string, unknown> }).copyLayout,
    );
    assert.equal(
      layout.originalReportSelected,
      true,
      'Seleciona o relatório original, como o Ctrl+C manual',
    );
    assert.equal(layout.reportCount, 1, 'Não cria um clone fora da área visível');
    assert.equal(layout.width, reportWidth);
    assert.ok(Number(layout.left) >= 0);
    assert.equal(layout.fontFamily, 'Arial, Helvetica, sans-serif');
    assert.equal(layout.fontSize, '11px');
    assert.equal(layout.observationsPadding, '12px');
    assert.equal(layout.observationsBorder, '1px');
    assert.equal(layout.observationTitleWeight, '700');
    assert.equal(layout.signatureMargin, '30px');

    const preview = await browser.newPage();
    await preview.setContent(copiedHtml);
    assert.equal(
      await preview
        .locator('input, select, textarea, [contenteditable], [data-editor-only]')
        .count(),
      0,
    );
    assert.ok(
      !copiedHtml.includes('Posto a selecionar'),
      'A linha de orientação nunca entra no e-mail',
    );
    const copiedRows = preview.locator('table[aria-label="Estado global por posto"] tbody tr');
    assert.equal(await copiedRows.count(), 4);
    assert.deepEqual(
      (await copiedRows.locator('th').allTextContents()).map((text) => text.trim()),
      fixture().map((item) => item.position),
    );
    assert.ok(!copiedHtml.includes('Versão instalada de posto não selecionado'));
    assert.equal(
      await preview.locator('.position-block a[href*="/browse/PRIT-"]').count(),
      4,
      'A seleção não altera os detalhes extraídos do Jira',
    );
    assert.ok((await copiedRows.nth(1).innerText()).includes(note));
    assert.equal(await copiedRows.nth(1).locator('img').count(), 0, 'A nota é texto, não HTML');
    assert.ok((await copiedRows.nth(3).innerText()).includes('--'));
    assert.ok((await preview.locator('body').innerText()).includes('Observação geral de teste.'));
    for (let index = 0; index < colors.length; index++) {
      assert.equal(
        await copiedRows
          .nth(index)
          .locator('strong')
          .evaluate((element) => getComputedStyle(element).color),
        colors[index],
      );
    }
    await preview.close();

    await page.evaluate(() => {
      document.execCommand = () => false;
    });
    await page.locator('#copy-email-button').click();
    assert.equal(
      await page.locator('#copy-email-status').innerText(),
      'Não foi possível copiar o relatório.',
    );
    assert.equal(
      await page.locator('.email-container').evaluate((element) => element.outerHTML),
      reportBeforeCopy,
    );
    assert.equal(await notes.nth(1).inputValue(), note);

    await page.evaluate(() => {
      document.execCommand = () => {
        throw new Error('Cópia bloqueada');
      };
    });
    await page.locator('#copy-email-button').click();
    assert.equal(
      await page.locator('#copy-email-status').innerText(),
      'Não foi possível copiar o relatório.',
    );
    assert.equal(
      await page.locator('.email-container').evaluate((element) => element.outerHTML),
      reportBeforeCopy,
    );

    // Os mesmos campos e respetivos listeners são restaurados, inclusive em caso de erro.
    await selects.nth(0).selectOption('nok');
    await notes.nth(0).fill('Nota após copiar');
    await page.reload();
    assert.equal(await selects.nth(0).inputValue(), 'nok');
    assert.equal(await notes.nth(0).inputValue(), 'Nota após copiar');

    // Os estados editoriais são independentes dos PRITs recolhidos pelo Jira.
    const otherReport = fixture();
    otherReport[0].reports[0].prit = 'PRIT-99';
    html = createEmailReport(otherReport);
    await page.reload();
    assert.equal(await selects.nth(0).inputValue(), 'nok');
    assert.equal(await notes.nth(0).inputValue(), 'Nota após copiar');

    // Armazenamento corrompido ou indisponível não impede a edição.
    await page.evaluate(() => {
      localStorage.setItem('t2d:global-status:v2:' + location.pathname, '{invalid');
    });
    await page.reload();
    assert.equal(await rows.count(), 4);
    await selectPositions(page, ['COCO PT']);
    assert.equal(await selects.nth(0).inputValue(), '');
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('Indisponível');
        },
      });
    });
    await page.reload();
    await selectPositions(page, ['COCO PT']);
    await selects.nth(0).selectOption('ok');
    await notes.nth(0).fill('Funciona sem armazenamento');
    assert.equal(
      await dots.nth(0).evaluate((element) => getComputedStyle(element).color),
      colors[0],
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
