import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import test from 'node:test';
import { chromium, request } from 'playwright';
import { extractTestPlanExecutions } from '../src/extractors/test-plan-executions.extractor';
import { extractExecutionStatuses } from '../src/extractors/execution-status.extractor';
import type { ReleaseLinks } from '../src/types/report.types';

test('consulta vínculos autenticados, pagina sem truncar e falha com aviso sem aproveitar listas parciais', async (t) => {
  type Reply = { status?: number; body: unknown; html?: boolean };
  let replies: Record<string, Reply> = {};
  const requests: { plan: string; startAt: number }[] = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url!, 'http://localhost');
    if (
      req.headers.cookie !== 'jira_session=fixture' ||
      url.pathname !== '/jira/rest/api/2/search'
    ) {
      res.writeHead(401).end();
      return;
    }
    const jql = url.searchParams.get('jql')!;
    const plan = /testPlanTestExecutions\("(PRIT-\d+)"\)/.exec(jql)?.[1];
    assert.ok(plan, jql);
    assert.match(jql, /ORDER BY key ASC$/);
    assert.equal(url.searchParams.get('fields'), 'key');
    assert.equal(url.searchParams.get('maxResults'), '100');
    const startAt = Number(url.searchParams.get('startAt'));
    requests.push({ plan, startAt });
    const reply = replies[`${plan}:${startAt}`] ?? { status: 404, body: {} };
    res.writeHead(reply.status ?? 200, {
      'Content-Type': reply.html ? 'text/html' : 'application/json',
    });
    res.end(reply.html ? String(reply.body) : JSON.stringify(reply.body));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const origin = `http://127.0.0.1:${(server.address() as { port: number }).port}/jira/`;
  const context = await request.newContext({
    extraHTTPHeaders: { Cookie: 'jira_session=fixture' },
  });
  t.after(() => context.dispose());
  const configured: ReleaseLinks['testPlans'] = {
    smokes: { prit: ' 8161 ', title: 'Smokes' },
    certification: { prit: 'prit-8161' },
    regression: { prit: '8165' },
    defectFixing: { prit: '' },
  };
  const page = (keys: string[], startAt: number, total: number): Reply => ({
    body: { issues: keys.map((key) => ({ key })), startAt, total, maxResults: 2 },
  });
  replies = {
    'PRIT-8161:0': page(['PRIT-1', 'PRIT-2'], 0, 3),
    'PRIT-8161:2': page(['PRIT-3'], 2, 3),
    'PRIT-8165:0': page([], 0, 0),
  };
  const original = structuredClone(configured);
  const plans = await extractTestPlanExecutions(context, configured, origin);
  assert.deepEqual(plans.smokes.executionPrits, ['PRIT-1', 'PRIT-2', 'PRIT-3']);
  assert.deepEqual(plans.certification.executionPrits, plans.smokes.executionPrits);
  assert.deepEqual(plans.regression.executionPrits, []);
  assert.equal(plans.defectFixing.executionPrits, undefined);
  assert.equal(plans.smokes.title, 'Smokes');
  assert.deepEqual(configured, original);
  assert.equal(requests.length, 3, 'PRITs de planos repetidos partilham a consulta');

  const warn = t.mock.method(console, 'warn', () => {});
  for (const invalid of [
    { status: 403, body: {} },
    { body: '<html>Login</html>', html: true },
    { body: { error: 'JQL indisponível' } },
    page([], 2, 3),
    page(['PRIT-1'], 2, 3),
    page(['PRIT-3'], 0, 3),
    { body: { issues: [{}], startAt: 2, total: 3 } },
  ] satisfies Reply[]) {
    replies['PRIT-8161:2'] = invalid;
    const failed = await extractTestPlanExecutions(context, plans, origin);
    assert.equal(
      failed.smokes.executionPrits,
      undefined,
      'Nunca publica dados parciais ou anteriores',
    );
    assert.equal(failed.certification.executionPrits, undefined);
    assert.deepEqual(failed.regression.executionPrits, [], 'Uma falha não impede os outros planos');
  }
  assert.equal(warn.mock.callCount(), 7);
  configured.smokes.prit = 'PRIT-1" OR key=PRIT-2';
  const before = requests.length;
  await assert.rejects(extractTestPlanExecutions(context, configured, origin), /PRIT inválido/);
  assert.equal(requests.length, before);
});

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
