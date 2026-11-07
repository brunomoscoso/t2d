import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { chromium } from 'playwright';

test('interface persiste, reordena, exclui e prepara o workflow sem expor tokens', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const files = new Set(['index.html', 'app.mjs', 'config.mjs', 'styles.css']);
    await page.route('http://t2d.test/**', async (route) => {
      const filename = new URL(route.request().url()).pathname.slice(1) || 'index.html';
      if (!files.has(filename)) return route.fulfill({ status: 404, body: 'Not found' });
      const contentType = { '.html': 'text/html', '.css': 'text/css', '.mjs': 'text/javascript' }[
        extname(filename)
      ];
      await route.fulfill({ contentType, body: await readFile(resolve('web', filename)) });
    });
    await page.goto('http://t2d.test/');
    await page.locator('#dashboard').fill('12345');
    await page.locator('#add-position').click();
    await page.locator('[data-field="name"]').fill('Loja Portugal');
    await page.locator('[data-add-prit="smoke"]').fill('11, 12');
    await page.locator('[data-type="smoke"] [data-action="prit-add"]').click();
    await page.locator('[data-action="prit-down"]').first().click();
    await page.reload();
    assert.equal(await page.locator('#prit-count').textContent(), '2');
    assert.equal(await page.locator('[data-field="name"]').inputValue(), 'Loja Portugal');
    await page.locator('#prepare').click();
    const prepared = JSON.parse(await page.locator('#run-json').inputValue());
    assert.deepEqual(prepared.positions[0].executions.smoke, ['PRIT-12', 'PRIT-11']);
    assert.equal(
      await page.locator('#open-actions').getAttribute('href'),
      'https://github.com/brunomoscoso/t2d/actions/workflows/t2d.yml',
    );
    assert.match((await page.locator('#run-dialog').textContent()) || '', /ainda não foi iniciada/);
    await page.locator('#close-dialog').click();
    await page.reload();
    assert.equal(await page.locator('#prit-count').textContent(), '2');
    await page.locator('[data-action="prit-delete"]').first().click();
    await page.reload();
    assert.equal(await page.locator('#prit-count').textContent(), '1');
    await page.locator('[data-add-prit="regression"]').fill('13, 14');
    await page.locator('[data-type="regression"] [data-action="prit-add"]').click();
    await page.locator('#add-position').click();
    await page.locator('[data-field="name"]').last().fill('Loja Espanha');
    await page.locator('[data-add-prit="smoke"]').last().fill('21');
    await page.locator('[data-type="smoke"] [data-action="prit-add"]').last().click();
    await mkdir('output/qa', { recursive: true });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'output/qa/t2d-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
    );
    await page.screenshot({ path: 'output/qa/t2d-mobile.png', fullPage: true });
    await page.locator('[data-action="up"]').last().click();
    await page.locator('#prepare').click();
    assert.equal(
      JSON.parse(await page.locator('#run-json').inputValue()).positions[0].name,
      'Loja Espanha',
    );
    await page.locator('#close-dialog').click();
    // Conteúdo importado deve ser apresentado como texto, sem executar HTML.
    const imported = {
      dashboardPageId: '123',
      positions: [
        { name: '<img src=x onerror=alert(1)>', testPlans: { portugal: '100', espanha: '200' } },
      ],
    };
    page.on('dialog', (dialog) => dialog.accept());
    await page
      .locator('#import-file')
      .setInputFiles({
        name: 'config.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify(imported)),
      });
    await page.waitForFunction(() => document.querySelectorAll('[data-country]').length === 2);
    assert.equal(await page.locator('#positions img').count(), 0);
    await page.locator('#prepare').click();
    assert.equal(
      JSON.parse(await page.locator('#run-json').inputValue()).positions[0].testPlans.portugal,
      'PRIT-100',
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});
