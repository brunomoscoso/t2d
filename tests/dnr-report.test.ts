import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { collectCertifications } from '../src/reports/dnr.report';
import { createEmailReport } from '../src/reports/email.report';
import { createHtmlReport } from '../src/reports/html.report';
import type { PositionReport, Report } from '../src/types/report.types';

function fixture(): PositionReport[] {
  return ['COCO PT', 'COCO ES'].map((position, index) => ({
    position,
    testPlanPrit: '',
    reports: [
      {
        prit: `PRIT-${index + 1}`,
        position,
        testType: 'certification',
        title: `[${position}] Certification - ${index ? 'customer   DISPLAY' : 'Customer Display'}`,
        mainStatus: 'OPEN',
        totalTests: 0,
        executionStatuses: [],
        issueLinks: [1, index + 2, 1].map((id) => ({
          prit: `PRIT-${id + 100}`,
          titulo: '',
          status: 'OPEN',
          priority: 'Low',
          relation: 'related',
        })),
      },
      {
        prit: `PRIT-${index + 10}`,
        position,
        testType: 'certification',
        title: 'Digital Invoice QR Code',
        mainStatus: 'OPEN',
        totalTests: 0,
        executionStatuses: [],
        issueLinks: [],
      },
      {
        prit: `PRIT-${index + 20}`,
        position,
        testType: 'certification',
        title: 'Digital Invoice SMS',
        mainStatus: 'OPEN',
        totalTests: 0,
        executionStatuses: [],
        issueLinks: [],
      },
    ] as Report[],
  }));
}

function prefixedFixture(): PositionReport[] {
  return [
    '[COCO][PT] Certification - ',
    '[PT] CERTIFICATION - ',
    '[RESELLERS][Reseller] CERTIFICATION - ',
  ].map((prefix, index) => {
    const position = fixture()[0];
    position.position = ['COCO PT', 'Marinas', 'Reseller'][index];
    position.reports.forEach((report, type) => {
      report.position = position.position;
      report.title =
        prefix + ['Customer Display', 'Digital Invoice QR Code', 'Digital Invoice SMS'][type];
      report.issueLinks = [100 + type, 200 + index * 10 + type].map((id) => ({
        prit: `PRIT-${id}`,
        titulo: '',
        status: '',
        priority: '',
        relation: 'related',
      }));
    });
    return position;
  });
}

test('DNRs: merges position prefixes and migrates saved selections', async () => {
  const positions = prefixedFixture();
  const groups = collectCertifications(positions);
  assert.deepEqual(
    groups.map((group) => group.title),
    ['Customer Display', 'Digital Invoice QR Code', 'Digital Invoice SMS'],
  );
  assert.deepEqual(groups[1].defects, ['PRIT-101', 'PRIT-201', 'PRIT-211', 'PRIT-221']);
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route('http://dnr-prefix.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: createEmailReport(positions, undefined, { plans: [] }),
      }),
    );
    await page.goto('http://dnr-prefix.test/report');
    await page.evaluate(() =>
      localStorage.setItem(
        't2d:dnrs:v1:' + location.pathname,
        JSON.stringify({
          version: 1,
          rows: [
            {
              number: 'DNR-42',
              url: 'https://repo.test/42',
              certification: '[resellers][reseller] certification - digital invoice qr code',
            },
          ],
        }),
      ),
    );
    await page.reload();
    assert.deepEqual(
      await page.locator('[data-dnr-field="certification"] option').allTextContents(),
      ['', 'Customer Display', 'Digital Invoice QR Code', 'Digital Invoice SMS'],
    );
    assert.equal(
      await page.locator('[data-dnr-field="certification"]').inputValue(),
      'digital invoice qr code',
    );
    assert.equal(await page.locator('[data-dnr-field="number"]').inputValue(), 'DNR-42');
    assert.equal(await page.locator('[data-dnr-field="url"]').inputValue(), 'https://repo.test/42');
    assert.deepEqual(
      await page.locator('[data-dnr-defects] a').allTextContents(),
      groups[1].defects,
    );
    await page.locator('[data-dnr-field="certification"]').selectOption('digital invoice sms');
    assert.deepEqual(
      await page.locator('[data-dnr-defects] a').allTextContents(),
      groups[2].defects,
    );
  } finally {
    await browser.close();
  }
  positions[0].reports[0].title = '[PT] Certification - [Feature A] Customer Display';
  positions[1].reports[0].title = '[PT] Certification - [Feature B] Customer Display';
  assert.equal(collectCertifications(positions).length, 5);
});

test('DNRs: grupos dinâmicos, posições, duplicados e ausência de certificações', () => {
  const groups = collectCertifications(fixture());
  assert.deepEqual(
    groups.map((g) => g.title),
    ['Customer Display', 'Digital Invoice QR Code', 'Digital Invoice SMS'],
  );
  assert.deepEqual(groups[0].defects, ['PRIT-101', 'PRIT-102', 'PRIT-103']);
  for (const create of [createHtmlReport, createEmailReport]) {
    assert.doesNotMatch(create([]), /id="dnr-section"/);
    const positions = fixture();
    positions.forEach((p) => p.reports.forEach((r) => (r.testType = 'smoke')));
    assert.doesNotMatch(create(positions, undefined, { plans: [] }), /id="dnr-section"/);
  }
  const country = fixture();
  country[0].reports[0].testType = 'portugal';
  assert.equal(collectCertifications(country)[0].defects.length, 3);
});

test('DNRs: edição, persistência, linhas, cópia, download e remoção completa', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.route('http://dnr.test/**', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: createEmailReport(fixture(), undefined, { plans: [] }),
      }),
    );
    await page.goto('http://dnr.test/report');
    const rows = page.locator('[data-dnr-row]');
    await page.locator('[data-dnr-field="number"]').fill('DNR <123>');
    await page.locator('[data-dnr-field="url"]').fill('https://repo.test/doc?a=1&b=2');
    await page.locator('[data-dnr-field="certification"]').selectOption('customer display');
    assert.equal(await page.locator('[data-dnr-defects] a').count(), 3);
    await page.getByRole('button', { name: 'Adicionar DNR', exact: true }).click();
    await rows.nth(1).locator('select').selectOption('digital invoice sms');
    assert.equal(await rows.nth(1).locator('[data-dnr-defects] a').count(), 0);
    await page.reload();
    assert.equal(await rows.count(), 2);
    assert.equal(await rows.first().locator('input').first().inputValue(), 'DNR <123>');
    await rows.nth(1).locator('[data-remove-dnr]').click();
    assert.equal(await rows.count(), 1);
    async function copy() {
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
      return page.evaluate(() => (window as any).copied as string);
    }
    const preview = await browser.newPage();
    await preview.setContent(await copy());
    assert.equal(
      await preview.locator('#dnr-section input, #dnr-section select, #dnr-section button').count(),
      0,
    );
    assert.match(await preview.locator('#dnr-section').innerText(), /DNR <123>/);
    assert.equal(await preview.locator('[data-dnr-defects] a').count(), 3);
    async function download() {
      const pending = page.waitForEvent('download');
      await page.locator('#download-report-button').click();
      const stream = await (await pending).createReadStream();
      const chunks: Buffer[] = [];
      for await (const chunk of stream!) chunks.push(Buffer.from(chunk));
      return Buffer.concat(chunks).toString('utf8');
    }
    await preview.setContent(await download());
    assert.match(await preview.locator('#dnr-section').innerText(), /DNR <123>/);
    assert.equal(
      await preview.locator('#dnr-section input, #dnr-section select, #dnr-section button').count(),
      0,
    );
    await page.locator('[data-remove-dnr]').click();
    await page.reload();
    assert.equal(await rows.count(), 0);
    await page.locator('[data-add-dnr]').click();
    await page.locator('[data-remove-dnr-section]').click();
    assert.equal(await page.locator('#dnr-section').count(), 0);
    assert.doesNotMatch(await copy(), /id="dnr-section"/);
    assert.doesNotMatch(await download(), /id="dnr-section"/);
    await page.reload();
    assert.equal(await page.locator('#dnr-section').count(), 0);
    assert.equal(await page.locator('#main-blockers-table').count(), 1);
    assert.equal(await page.locator('.operation-card').count(), 6);
    assert.deepEqual(errors, []);
    await page.setContent(createHtmlReport(fixture(), undefined, { plans: [] }));
    // Sem armazenamento (setContent mantém o mesmo URL), usa um contexto separado.
    const standalone = await browser.newPage();
    await standalone.setContent(createHtmlReport(fixture(), undefined, { plans: [] }));
    await standalone.locator('[data-add-dnr]').click();
    assert.equal(await standalone.locator('[data-dnr-row]').count(), 2);
  } finally {
    await browser.close();
  }
});
