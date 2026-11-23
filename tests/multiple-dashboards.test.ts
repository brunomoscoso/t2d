import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { writeReports } from '../src/reports/report.writer';
import type { DashboardData } from '../src/types/report.types';

test('inclui os defects e links de dois dashboards no HTML, email e JSON', (t) => {
  const root = process.cwd();
  fs.mkdirSync(path.join(root, 'test-results'), { recursive: true });
  const directory = fs.mkdtempSync(path.join(root, 'test-results', 'dashboards-'));
  fs.mkdirSync(path.join(directory, 'src/templates'), { recursive: true });
  fs.copyFileSync(
    path.join(root, 'src/templates/email-body.html'),
    path.join(directory, 'src/templates/email-body.html'),
  );
  t.mock.method(console, 'log', () => {});
  t.mock.method(console, 'warn', () => {});
  const dashboards: DashboardData[] = ['24360', '24419'].map((pageId, index) => ({
    pageId,
    rawTitle: `Dashboard ${pageId}`,
    title: `Dashboard ${pageId}`,
    total: 1,
    defects: [
      {
        key: `PRIT-${index + 1}`,
        summary: `Defect ${pageId}`,
        issueType: 'Bug',
        priority: 'High',
        status: 'Open',
        assignee: '',
        created: '',
      },
    ],
  }));
  process.chdir(directory);
  try {
    writeReports(
      [],
      dashboards,
      { testPlans: [], dashboards: dashboards.map(({ pageId, title }) => ({ pageId, title })) },
      [],
    );
    for (const file of ['report.html', 'email.html']) {
      const html = fs.readFileSync(path.join(directory, 'output', file), 'utf8');
      for (const dashboard of dashboards) {
        assert.ok(html.includes(dashboard.defects[0].summary));
        assert.ok(html.includes(`selectPageId=${dashboard.pageId}`));
      }
      assert.equal((html.match(/class="dashboard-block"/g) ?? []).length, 2);
    }
    assert.deepEqual(JSON.parse(fs.readFileSync('output/dashboard.json', 'utf8')), dashboards);
    const saved = JSON.parse(fs.readFileSync('output/report.json', 'utf8'));
    assert.deepEqual(saved.dashboards, dashboards);
    assert.deepEqual(
      saved.releaseLinks.dashboards,
      dashboards.map(({ pageId, title }) => ({ pageId, title })),
    );
  } finally {
    process.chdir(root);
  }
});
