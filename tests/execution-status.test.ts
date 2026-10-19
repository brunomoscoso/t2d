import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { extractExecutionStatuses } from '../src/extractors/execution-status.extractor';

test('fallback de status preserva PENDING_3RD e status adicionais com algarismos', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(`<section><h2>Overall Execution Status</h2>
      <div>3 PASS 2 FOR_TESTING 4 PENDING_3RD 5 CUSTOM_2 1 TODO</div>
      <div>Total Tests: 15</div></section>`);
    assert.deepEqual(await extractExecutionStatuses(page), [
      { status: 'PASS', quantidade: 3 },
      { status: 'FOR_TESTING', quantidade: 2 },
      { status: 'PENDING_3RD', quantidade: 4 },
      { status: 'CUSTOM_2', quantidade: 5 },
      { status: 'TODO', quantidade: 1 },
    ]);
  } finally {
    await browser.close();
  }
});

test('falha explicitamente quando a secção de status não tem resultados', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(
      '<section><h2>Overall Execution Status</h2><div>Loading...</div></section>',
    );
    await assert.rejects(extractExecutionStatuses(page), /não contém dados|nenhum status/i);
  } finally {
    await browser.close();
  }
});
