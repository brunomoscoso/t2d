import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium } from 'playwright';
import { waitForJiraAuthentication } from '../src/services/jira-auth.service';

test('MFA aguarda a origem e os elementos do Jira e inicia sem stdin', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route('https://**/*', (route) =>
      route.fulfill({
        contentType: 'text/html',
        body: '<h1 id="summary-val">Issue</h1><span id="status-val">Open</span>',
      }),
    );
    const options = { jiraUrl: 'https://jira.test', timeoutMs: 50, headless: true };
    await page.goto('https://login.test');
    await assert.rejects(waitForJiraAuthentication(page, options), /Tempo de autenticação/);
    await page.goto('https://jira.test/browse/PRIT-1');
    await page.locator('#status-val').evaluate((element) => element.remove());
    await assert.rejects(waitForJiraAuthentication(page, options), /Tempo de autenticação/);
    await page.evaluate(() => {
      setTimeout(() => {
        const el = document.createElement('span');
        el.id = 'status-val';
        el.textContent = 'Open';
        document.body.append(el);
      }, 50);
    });
    await waitForJiraAuthentication(page, { ...options, timeoutMs: 3000 });
    await page.close();
    await assert.rejects(waitForJiraAuthentication(page, options), /fechado/);
  } finally {
    await browser.close();
  }
});

test('runner deteta palavra-passe e mostra apenas o número específico do Authenticator', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route('https://login.test/**', (route) =>
      route.fulfill({ contentType: 'text/html', body: '<input type="password">' }),
    );
    await page.goto('https://login.test/');
    const options = { jiraUrl: 'https://jira.test', timeoutMs: 100, headless: true };
    await assert.rejects(waitForJiraAuthentication(page, options), /palavra-passe/);
    await page.setContent(
      '<span id="idRichContext_DisplaySign">42</span><p>Outro código 123456</p>',
    );
    const numbers: string[] = [];
    await assert.rejects(
      waitForJiraAuthentication(page, {
        ...options,
        onMfaNumber: (number) => numbers.push(number),
      }),
      /Tempo de autenticação/,
    );
    assert.deepEqual(numbers, ['42']);
  } finally {
    await browser.close();
  }
});
