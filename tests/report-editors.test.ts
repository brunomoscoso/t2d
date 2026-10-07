import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, type Page } from 'playwright';
import { createEmailReport } from '../src/reports/email.report';
import type { PositionReport } from '../src/types/report.types';

const fixture = (): PositionReport[] => [{
  position: 'COCO PT',
  reports: [{
    prit: 'PRIT-1', title: '[COCO PT] Smoke', mainStatus: 'OPEN', labels: [], position: 'COCO PT',
    totalTests: 1, executionStatuses: [{ status: 'PASS', quantidade: 1 }],
    issueLinks: [{ prit: 'PRIT-2', titulo: 'Antigo', relation: 'tests', priority: 'High', status: 'OPEN' }],
  }],
}];
type CopyWindow = typeof window & { copiedHtml: string };

async function captureClipboard(page: Page) {
  await page.evaluate(() => {
    document.execCommand = command => {
      if (command !== 'copy') return false;
      const clipboardData = new DataTransfer();
      const event = new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true });
      document.dispatchEvent(event);
      (window as CopyWindow).copiedHtml = clipboardData.getData('text/html');
      return event.defaultPrevented;
    };
  });
}

async function copyAndCheckDom(page: Page) {
  const before = await page.locator('.email-container').evaluate(element => element.outerHTML);
  await page.locator('#copy-email-button').click();
  assert.equal(await page.locator('.email-container').evaluate(element => element.outerHTML), before);
  return page.evaluate(() => (window as CopyWindow).copiedHtml);
}

test('status de instalação migra dados anteriores, guarda OK/NOK e copia as três colunas', async () => {
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  try {
    const page = await browser.newPage();
    await page.route('http://editors.test/**', route => route.fulfill({ contentType: 'text/html', body: createEmailReport(fixture()) }));
    await page.goto('http://editors.test/email.html');
    await page.evaluate(() => {
      const table = document.getElementById('global-status-table')!;
      localStorage.setItem('t2d:global-status:v1:' + location.pathname + ':' + table.dataset.reportKey,
        JSON.stringify([{ position: 'COCO PT', status: 'completed', note: 'Nota anterior' }]));
    });
    await page.reload();
    const installation = page.getByLabel('Status de instalação de COCO PT', { exact: true });
    assert.deepEqual(await installation.locator('option').allTextContents(), ['--', 'OK', 'NOK']);
    assert.equal(await installation.inputValue(), '');
    assert.equal(await page.getByLabel('Estado global de COCO PT', { exact: true }).inputValue(), 'completed');
    assert.equal(await page.getByLabel('Nota de COCO PT', { exact: true }).inputValue(), 'Nota anterior');
    await installation.selectOption('ok');
    await page.getByRole('checkbox', { name: 'Marinas', exact: true }).check();
    await page.getByLabel('Status de instalação de Marinas', { exact: true }).selectOption('nok');
    await page.getByRole('checkbox', { name: 'Marinas', exact: true }).uncheck();
    await page.reload();
    assert.equal(await installation.inputValue(), 'ok');
    assert.equal(await installation.evaluate(element => getComputedStyle(element).color), 'rgb(34, 160, 107)');
    await page.getByRole('checkbox', { name: 'Marinas', exact: true }).check();
    assert.equal(await page.getByLabel('Status de instalação de Marinas', { exact: true }).inputValue(), 'nok');
    assert.equal(await page.getByLabel('Status de instalação de Marinas', { exact: true })
      .evaluate(element => getComputedStyle(element).color), 'rgb(222, 53, 11)');
    assert.equal(await page.getByLabel('Nota de COCO PT', { exact: true }).inputValue(), 'Nota anterior');
    await page.getByLabel('Nota de COCO PT', { exact: true }).fill('Nota <img src=x onerror=alert(1)>');
    await captureClipboard(page);
    const preview = await browser.newPage();
    await preview.setContent(await copyAndCheckDom(page));
    assert.deepEqual(await preview.locator('#global-status-table thead th').allTextContents(),
      ['Postos', 'Status de instalação', 'Estado Global']);
    const rows = preview.locator('[data-global-status-row]');
    assert.equal(await rows.count(), 2);
    assert.equal(await rows.nth(0).locator('td').first().innerText(), 'OK');
    assert.equal(await rows.nth(1).locator('td').first().innerText(), 'NOK');
    assert.equal(await rows.nth(0).locator('td').first().locator('strong')
      .evaluate(element => getComputedStyle(element).color), 'rgb(34, 160, 107)');
    assert.equal(await rows.nth(1).locator('td').first().locator('strong')
      .evaluate(element => getComputedStyle(element).color), 'rgb(222, 53, 11)');
    assert.match(await rows.nth(0).locator('td').last().innerText(), /Concluído.*Nota <img/);
    assert.equal(await preview.locator('input, textarea, select, [data-editor-only]').count(), 0);
    assert.equal(await preview.locator('img').count(), 0);
    for (const throws of [false, true]) {
      await page.evaluate(shouldThrow => {
        document.execCommand = () => { if (shouldThrow) throw new Error('Cópia bloqueada'); return false; };
      }, throws);
      await copyAndCheckDom(page);
    }
    await installation.selectOption('nok');
    await page.reload();
    assert.equal(await installation.inputValue(), 'nok', 'Os listeners continuam ativos após falha na cópia');
  } finally {
    await browser.close();
  }
});

test('bloqueadores são editáveis, persistentes e copiáveis mesmo sem defects na sprint', async () => {
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    let html = createEmailReport(fixture());
    await page.route('http://blockers.test/**', route => route.fulfill({ contentType: 'text/html', body: html }));
    await page.goto('http://blockers.test/email.html');
    const table = page.locator('#main-blockers-table');
    assert.deepEqual(await table.locator('thead th').allTextContents(), ['Tema', 'Impacto']);
    assert.equal(await table.locator('[data-blocker-row]').count(), 1);
    assert.equal(await table.locator('textarea').count(), 2);
    assert.equal(await page.getByRole('button', { name: 'Remover bloqueador 1', exact: true }).isDisabled(), true);
    for (let index = 0; index < 4; index++) {
      await page.getByRole('button', { name: 'Adicionar bloqueador', exact: true }).click();
    }
    assert.equal(await table.locator('[data-blocker-row]').count(), 5);
    assert.equal(await page.locator('#position-defects-table [data-defects-empty] td').count(), 5);
    assert.deepEqual(await page.locator('#position-defects-table [data-defects-empty] td').allTextContents(),
      ['--', '--', '--', '--', '--']);
    assert.equal(await page.locator('[data-sprint-defect]').count(), 0);
    const theme = 'TPA sem funcionar';
    const impact = 'Bloqueia execuções testes\n\nA aguardar <img src=x onerror=alert(1)> & "validação"';
    await page.getByLabel('Tema do bloqueador 1', { exact: true }).fill(theme);
    await page.getByLabel('Impacto do bloqueador 1', { exact: true }).fill(impact);
    await page.getByLabel('Tema do bloqueador 5', { exact: true }).fill('Promoções Happy Hour');
    await page.reload();
    assert.equal(await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(), theme);
    assert.equal(await page.getByLabel('Impacto do bloqueador 1', { exact: true }).inputValue(), impact);
    assert.equal(await page.getByLabel('Tema do bloqueador 5', { exact: true }).inputValue(), 'Promoções Happy Hour');
    await page.getByRole('checkbox', { name: 'COCO PT', exact: true }).check();
    for (const width of [1920, 1100, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 1080 });
      await page.evaluate(() => new Promise(requestAnimationFrame));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1));
      const fieldsFit = await table.locator('textarea').evaluateAll(fields => fields.map(field => {
        const box = field.getBoundingClientRect(), cell = field.closest('td')!.getBoundingClientRect();
        return {
          fits: box.left >= cell.left && box.right <= cell.right + 1 && field.scrollHeight <= field.clientHeight + 1,
          left: box.left, right: box.right, cellLeft: cell.left, cellRight: cell.right,
          height: field.clientHeight, contentHeight: field.scrollHeight,
        };
      }));
      assert.ok(fieldsFit.every(field => field.fits), width + 'px: ' + JSON.stringify(fieldsFit));
    }
    await captureClipboard(page);
    const preview = await browser.newPage();
    await preview.setContent(await copyAndCheckDom(page));
    const copied = preview.locator('#main-blockers-table');
    assert.equal(await copied.locator('[data-blocker-row]').count(), 5);
    assert.equal(await copied.locator('textarea').count(), 0);
    assert.equal(await copied.locator('[data-blocker-row="0"] td').first().innerText(), theme);
    assert.equal(await copied.locator('[data-blocker-row="0"] td').last().locator('br').count(), 2);
    assert.match(await copied.innerText(), /A aguardar <img src=x onerror=alert\(1\)> & "validação"/);
    assert.deepEqual((await copied.locator('[data-blocker-row="1"] td').allTextContents()).map(text => text.trim()), ['--', '--']);
    assert.equal(await copied.locator('img').count(), 0);
    assert.equal(await preview.locator('#position-defects-table [data-defects-empty] td').count(), 5);
    for (const throws of [false, true]) {
      await page.evaluate(shouldThrow => {
        document.execCommand = () => { if (shouldThrow) throw new Error('Cópia bloqueada'); return false; };
      }, throws);
      await copyAndCheckDom(page);
    }
    await page.getByLabel('Tema do bloqueador 1', { exact: true }).fill('Tema atualizado');
    await page.reload();
    assert.equal(await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(), 'Tema atualizado');
    const otherReport = fixture();
    otherReport[0].reports[0].prit = 'PRIT-99';
    html = createEmailReport(otherReport);
    await page.reload();
    assert.equal(await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(), '');
    await page.evaluate(() => {
      const table = document.getElementById('main-blockers-table')!;
      localStorage.setItem('t2d:main-blockers:v1:' + location.pathname + ':' + table.dataset.reportKey, '{invalid');
    });
    await page.reload();
    assert.equal(await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(), '');
    await page.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', { get() { throw new Error('Indisponível'); } });
    });
    html = createEmailReport([]);
    await page.reload();
    assert.equal(await table.locator('[data-blocker-row]').count(), 1);
    assert.equal(await page.locator('#position-defects-table [data-defects-empty] td').count(), 5);
    await page.getByLabel('Tema do bloqueador 1', { exact: true }).fill('Funciona sem armazenamento');
    await captureClipboard(page);
    await preview.setContent(await copyAndCheckDom(page));
    assert.match(await preview.locator('#main-blockers-table').innerText(), /Funciona sem armazenamento/);
    assert.equal(await preview.locator('#position-defects-table').count(), 1);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('adiciona e remove bloqueadores sem perder os restantes e migra as cinco linhas anteriores', async () => {
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('http://dynamic-blockers.test/**', route => route.fulfill({
      contentType: 'text/html', body: createEmailReport(fixture()),
    }));
    await page.goto('http://dynamic-blockers.test/email.html');
    const rows = page.locator('#main-blockers-table [data-blocker-row]');
    const add = page.getByRole('button', { name: 'Adicionar bloqueador', exact: true });
    assert.equal(await rows.count(), 1);
    await page.getByLabel('Tema do bloqueador 1', { exact: true }).fill('Primeiro');
    await add.click();
    assert.equal(await page.getByLabel('Tema do bloqueador 2', { exact: true }).evaluate(element => element === document.activeElement), true);
    await page.getByLabel('Tema do bloqueador 2', { exact: true }).fill('Segundo');
    await add.click();
    await page.getByLabel('Tema do bloqueador 3', { exact: true }).fill('Terceiro');
    await page.getByLabel('Impacto do bloqueador 3', { exact: true }).fill('Impacto preservado');
    await page.getByRole('button', { name: 'Remover bloqueador 2', exact: true }).click();
    assert.equal(await rows.count(), 2);
    assert.equal(await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(), 'Primeiro');
    assert.equal(await page.getByLabel('Tema do bloqueador 2', { exact: true }).inputValue(), 'Terceiro');
    assert.equal(await page.getByLabel('Impacto do bloqueador 2', { exact: true }).inputValue(), 'Impacto preservado');
    await page.reload();
    assert.equal(await rows.count(), 2);
    assert.equal(await page.getByLabel('Tema do bloqueador 2', { exact: true }).inputValue(), 'Terceiro');
    await captureClipboard(page);
    const preview = await browser.newPage();
    await preview.setContent(await copyAndCheckDom(page));
    assert.equal(await preview.locator('#main-blockers-table [data-blocker-row]').count(), 2);
    assert.doesNotMatch(await preview.locator('#main-blockers-table').innerText(), /Segundo|Remover/);
    assert.equal(await preview.locator('button, [data-editor-only], textarea').count(), 0);
    await add.click();
    await page.getByLabel('Tema do bloqueador 3', { exact: true }).fill('Adicionado após copiar');
    await page.getByRole('button', { name: 'Remover bloqueador 1', exact: true }).click();
    assert.equal(await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(), 'Terceiro');
    await page.getByRole('button', { name: 'Remover bloqueador 2', exact: true }).click();
    assert.equal(await rows.count(), 1);
    assert.equal(await page.getByRole('button', { name: 'Remover bloqueador 1', exact: true }).isDisabled(), true);
    await add.click();
    await page.reload();
    assert.equal(await rows.count(), 2, 'Uma linha vazia adicionada manualmente também é guardada');
    for (let index = 0; index < 4; index++) await add.click();
    assert.equal(await rows.count(), 6, 'A tabela permite mais que as cinco linhas do modelo anterior');

    await page.evaluate(() => {
      const table = document.getElementById('main-blockers-table')!;
      localStorage.setItem('t2d:main-blockers:v1:' + location.pathname + ':' + table.dataset.reportKey,
        JSON.stringify([
          { theme: '', impact: '' },
          { theme: 'Tema antigo', impact: 'Impacto antigo' },
          { theme: '', impact: '' },
          { theme: '', impact: 'Outro impacto' },
          { theme: '', impact: '' },
        ]));
    });
    await page.reload();
    assert.equal(await rows.count(), 2);
    assert.equal(await page.getByLabel('Tema do bloqueador 1', { exact: true }).inputValue(), 'Tema antigo');
    assert.equal(await page.getByLabel('Impacto do bloqueador 1', { exact: true }).inputValue(), 'Impacto antigo');
    assert.equal(await page.getByLabel('Impacto do bloqueador 2', { exact: true }).inputValue(), 'Outro impacto');
    await page.reload();
    assert.equal(await rows.count(), 2);
    assert.equal(await page.getByLabel('Impacto do bloqueador 2', { exact: true }).inputValue(), 'Outro impacto');
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
