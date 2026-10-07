import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright';
import { extractReleaseLinks } from '../src/extractors/release-links.extractor';
import { createReleaseLinksSection } from '../src/reports/release-links.report';
import { writeReports } from '../src/reports/report.writer';
import type { ReleaseLinks } from '../src/types/report.types';

const fixture = (): ReleaseLinks => ({
  testPlans: {
    smokes: { prit: ' 8161 ' },
    certification: { prit: 'prit-8157' },
    regression: { prit: 'PRIT-8165' },
    defectFixing: { prit: '8171' },
  },
  dashboardPageId: ' 24419 ',
});

test('extrai os títulos usando a sessão autenticada e entrega-os ao relatório', async t => {
  type Reply = { status?: number; body: unknown; html?: boolean };
  let replies: Record<string, Reply> = {};
  let requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(request.url!);
    if (request.headers.cookie !== 'jira_session=fixture') {
      response.writeHead(401).end();
      return;
    }
    const reply = replies[request.url!] ?? { status: 404, body: {} };
    response.writeHead(reply.status ?? 200, { 'Content-Type': reply.html ? 'text/html' : 'application/json' });
    response.end(reply.html ? String(reply.body) : JSON.stringify(reply.body));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'msedge' : undefined, headless: true });
  t.after(() => browser.close());
  const context = await browser.newContext();
  await context.addCookies([{ name: 'jira_session', value: 'fixture', url: origin }]);
  const issuePath = (prit: string) => `/jira/rest/api/2/issue/${prit}?fields=summary`;
  const dashboardPath = '/jira/rest/api/2/dashboard/24419';

  await t.test('consulta quatro planos e o nome do dashboard, preservando os títulos na cópia', async () => {
    const titles = [
      '[Passport X] Smoke <img src=x onerror=alert(1)> & "QA" $&',
      '[Passport X] Certification', '[Passport X] Regression PT & SP', '[Passport X] Defect Fixing',
    ];
    const keys = ['PRIT-8161', 'PRIT-8157', 'PRIT-8165', 'PRIT-8171'];
    replies = Object.fromEntries(keys.map((key, index) => [issuePath(key), { body: { fields: { summary: ` ${titles[index]} ` } } }]));
    replies[dashboardPath] = { body: { name: ' Retail 4.0 - Certification <release> & QA ' } };
    requests = [];
    const configured = fixture();
    const original = structuredClone(configured);
    const links = await extractReleaseLinks(context.request, configured, `${origin}/jira/`);
    assert.deepEqual(configured, original, 'A coleta não altera a configuração');
    assert.deepEqual(Object.values(links.testPlans).map(plan => plan.prit), keys);
    assert.deepEqual(Object.values(links.testPlans).map(plan => plan.title), titles);
    assert.equal(links.dashboardTitle, 'Retail 4.0 - Certification <release> & QA');
    assert.deepEqual(requests.sort(), [...keys.map(issuePath), dashboardPath].sort());

    const cwd = process.cwd();
    const temporaryRoot = fs.realpathSync(tmpdir());
    const directory = fs.mkdtempSync(path.join(temporaryRoot, 't2d-release-links-'));
    try {
      fs.mkdirSync(path.join(directory, 'src/templates'), { recursive: true });
      fs.copyFileSync(path.join(cwd, 'src/templates/email-body.html'), path.join(directory, 'src/templates/email-body.html'));
      process.chdir(directory);
      writeReports([], undefined, links);
      const html = fs.readFileSync('output/email.html', 'utf8');
      assert.deepEqual(JSON.parse(fs.readFileSync('output/report.json', 'utf8')), []);
      assert.equal(fs.existsSync('output/dashboard.json'), false, 'O título não depende da coleta de defects');
      const page = await context.newPage();
      await page.setContent(html);
      const section = page.locator('#release-links-section');
      const expectedText = keys.map((key, index) => `[${key}] ${titles[index]}`).concat(links.dashboardTitle!);
      assert.deepEqual(await section.locator('a').allTextContents(), expectedText);
      assert.equal(await section.locator('img').count(), 0);
      assert.equal(await section.evaluate(el => el.previousElementSibling?.id), 'main-blockers-section');
      const hrefs = await section.locator('a').evaluateAll(anchors => anchors.map(a => a.getAttribute('href')));
      await page.evaluate(() => {
        document.execCommand = () => {
          const clipboardData = new DataTransfer();
          document.dispatchEvent(new ClipboardEvent('copy', { clipboardData, bubbles: true, cancelable: true }));
          (window as typeof window & { copiedHtml: string }).copiedHtml = clipboardData.getData('text/html');
          return true;
        };
      });
      const before = await page.locator('.email-container').evaluate(el => el.outerHTML);
      await page.locator('#copy-email-button').click();
      assert.equal(await page.locator('.email-container').evaluate(el => el.outerHTML), before);
      await page.setContent(await page.evaluate(() => (window as typeof window & { copiedHtml: string }).copiedHtml));
      assert.deepEqual(await section.locator('a').allTextContents(), expectedText);
      assert.deepEqual(await section.locator('a').evaluateAll(anchors => anchors.map(a => a.getAttribute('href'))), hrefs);
      assert.equal(await section.locator('img').count(), 0);
      await page.close();
    } finally {
      process.chdir(cwd);
      const cleanupDirectory = fs.realpathSync(directory);
      assert.equal(path.dirname(cleanupDirectory), temporaryRoot);
      assert.ok(path.basename(cleanupDirectory).startsWith('t2d-release-links-'));
      fs.rmSync(cleanupDirectory, { recursive: true, force: true });
    }
  });

  await t.test('mantém todos os links se houver falta de acesso, resposta de login ou título ausente', async t => {
    replies = {
      [issuePath('PRIT-8161')]: { status: 403, body: {} },
      [issuePath('PRIT-8157')]: { body: '<html>Login</html>', html: true },
      [issuePath('PRIT-8165')]: { body: { fields: { summary: ' ' } } },
      [issuePath('PRIT-8171')]: { status: 404, body: {} },
      [dashboardPath]: { status: 500, body: {} },
    };
    const warn = t.mock.method(console, 'warn', () => {});
    const configured = fixture();
    configured.testPlans.smokes.title = 'Título de uma coleta anterior';
    configured.dashboardTitle = 'Título anterior';
    const links = await extractReleaseLinks(context.request, configured, `${origin}/jira`);
    assert.ok(Object.values(links.testPlans).every(plan => !plan.title));
    assert.equal(links.dashboardTitle, undefined);
    assert.equal(warn.mock.callCount(), 5);
    const html = createReleaseLinksSection(links);
    assert.equal((html.match(/<a href=/g) || []).length, 5);
    assert.ok(html.includes('[PRIT-8161]'));
    assert.ok(html.includes('Dashboard 24419'));
    assert.ok(!html.includes('Título anterior'));
  });

  await t.test('ignora campos vazios, consulta um PRIT repetido uma única vez e rejeita um PRIT inválido', async () => {
    replies = { [issuePath('PRIT-8161')]: { body: { fields: { summary: 'Plano comum' } } } };
    requests = [];
    const configured = fixture();
    configured.testPlans.certification.prit = '';
    configured.testPlans.regression.prit = 'prit-8161';
    configured.testPlans.defectFixing.prit = ' ';
    configured.dashboardPageId = '';
    const links = await extractReleaseLinks(context.request, configured, `${origin}/jira`);
    assert.deepEqual(requests, [issuePath('PRIT-8161')]);
    assert.equal(links.testPlans.smokes.title, 'Plano comum');
    assert.equal(links.testPlans.regression.title, 'Plano comum');
    assert.equal(links.testPlans.defectFixing.prit, '');
    configured.testPlans.smokes.prit = 'PRIT-1/other';
    requests = [];
    await assert.rejects(extractReleaseLinks(context.request, configured, `${origin}/jira`), /PRIT inválido/);
    assert.deepEqual(requests, []);
  });
});
