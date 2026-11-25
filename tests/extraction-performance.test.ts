import assert from 'node:assert/strict';
import test from 'node:test';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { extractIssueLinks } from '../src/extractors/issueLinks.extractor';
import { extractExecutionStatuses } from '../src/extractors/execution-status.extractor';
import { waitForVerifiedData } from '../src/services/extraction-verification.service';
import { collectWithPages } from '../src/services/execution-pool.service';

test('leitura conjunta preserva CSS, relações, duplicados e prioridades', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(`<style>.jira-issue-status-lozenge { text-transform: uppercase }</style>
      <a class="issue-link link-title">IGNORAR</a>
      <div id="linkingmodule"><dl><dt>is blocked by</dt><dd><ul>
      <li><a class="issue-link link-title">PRIT-1</a><span class="link-summary">Erro A</span><span class="jira-issue-status-lozenge">In Progress</span><span class="priority"><img alt="Highest"></span></li>
      <li><a class="issue-link link-title">PRIT-2</a><span class="link-summary">Erro B</span><span class="jira-issue-status-lozenge">Open</span><span data-priority="Low"></span></li>
      </ul></dd><dt>tests</dt><dd><div><a class="issue-link link-title">PRIT-1</a><span class="link-summary">Erro A</span><span class="jira-issue-status-lozenge">In Progress</span></div></dd></dl></div>`);
    assert.deepEqual(await extractIssueLinks(page), [
      {
        prit: 'PRIT-1',
        titulo: 'Erro A',
        status: 'IN PROGRESS',
        priority: 'Highest',
        relation: 'is blocked by',
      },
      {
        prit: 'PRIT-2',
        titulo: 'Erro B',
        status: 'OPEN',
        priority: 'Low',
        relation: 'is blocked by',
      },
      {
        prit: 'PRIT-1',
        titulo: 'Erro A',
        status: 'IN PROGRESS',
        priority: 'Unknown',
        relation: 'tests',
      },
    ]);
    await page.setContent('<ul><li><a class="issue-link link-title">PRIT-3</a></li></ul>');
    assert.deepEqual(await extractIssueLinks(page), [
      { prit: 'PRIT-3', titulo: '', status: '', priority: 'Unknown', relation: 'related' },
    ]);
    await page.setContent('<div id="linkingmodule"></div>');
    assert.deepEqual(await extractIssueLinks(page), []);
  } finally {
    await browser.close();
  }
});

test('esperas acompanham Xray e links que chegam depois do título', async () => {
  const browser = await chromium.launch({
    channel: process.platform === 'win32' ? 'msedge' : undefined,
  });
  try {
    const page = await browser.newPage();
    await page.setContent(`<section><h2>Overall Execution Status</h2><div id="data"></div></section>
      <div id="linkingmodule" aria-busy="true"></div>`);
    await page.evaluate(() => {
      setTimeout(() => {
        document.querySelector('#data')!.innerHTML =
          '<span class="testexec-status-count">0</span><span class="testexec-status-name">FAIL</span><span class="testexec-status-count">2</span><span class="testexec-status-name">PASS</span><div>Total Tests: 2</div>';
      }, 200);
      setTimeout(() => {
        const module = document.querySelector('#linkingmodule')!;
        module.innerHTML = '<ul><li><a class="issue-link link-title">PRIT-4</a></li></ul>';
        module.setAttribute('aria-busy', 'false');
      }, 900);
    });
    assert.deepEqual(await extractExecutionStatuses(page), [
      { status: 'FAIL', quantidade: 0 },
      { status: 'PASS', quantidade: 2 },
    ]);
    const expected = {
      prit: 'PRIT-1',
      title: 'Teste',
      mainStatus: 'OPEN',
      totalTests: 2,
      executionStatuses: [],
      issueLinks: [
        { prit: 'PRIT-4', titulo: '', status: '', priority: 'Unknown', relation: 'related' },
      ],
    };
    await waitForVerifiedData(expected, async () => ({
      ...expected,
      issueLinks: await extractIssueLinks(page),
    }));
    assert.equal((await extractIssueLinks(page))[0].prit, 'PRIT-4');
    await page.evaluate(() =>
      document.querySelector('#linkingmodule')!.setAttribute('aria-busy', 'true'),
    );
    await assert.rejects(
      waitForVerifiedData(expected, async () => ({ ...expected, issueLinks: [] }), 200),
      /não confirmado/,
    );
  } finally {
    await browser.close();
  }
});

test('pool limita a duas páginas, preserva ordem e fecha páginas após falha', async () => {
  let opened = 0;
  let closed = 0;
  const context = {
    newPage: async () => {
      opened++;
      return {
        close: async () => {
          closed++;
        },
      } as Page;
    },
  } as BrowserContext;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const result = await collectWithPages(context, [1, 2, 3], async (_, item) => {
    if (item === 1) await gate;
    if (item === 2) release();
    return item * 10;
  });
  assert.deepEqual(result, [10, 20, 30]);
  assert.equal(opened, 2);
  assert.equal(closed, 2);
  const visited: number[] = [];
  await assert.rejects(
    collectWithPages(context, [1, 2, 3, 4], async (_, item) => {
      visited.push(item);
      if (item === 1) throw new Error('falha de recolha');
      await new Promise((resolve) => setImmediate(resolve));
      return item;
    }),
    /falha de recolha/,
  );
  assert.deepEqual(visited, [1, 2]);
  assert.equal(closed, 4);
  const broken = {
    newPage: async () => {
      throw new Error('Browser fechado');
    },
  } as unknown as BrowserContext;
  assert.deepEqual(
    await collectWithPages(
      broken,
      [1, 2],
      async (_, item) => item,
      2,
      (item) => -item,
    ),
    [-1, -2],
  );
});
