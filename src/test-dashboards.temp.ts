// Teste manual temporário: npm run test:dashboards:temp [-- ID1 ID2]
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DASHBOARD_PAGE_IDS } from './config/positions.config';
import { extractDashboard } from './extractors/dashboard.extractor';
import { createBrowserSession } from './services/browser.service';
import type { DashboardData } from './types/report.types';
import { getConfiguredExecutions, resolvePositions } from './utils/position.utils';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help')) {
    console.log('Uso: npm run test:dashboards:temp [-- ID1 ID2]');
    console.log('Sem IDs, utiliza DASHBOARD_PAGE_IDS. Requer login/MFA no Edge.');
    console.log('Guarda dados e validações numa pasta exclusiva em output/dashboard-test-*.');
    return;
  }

  const ids = [
    ...new Set((args.length ? args : DASHBOARD_PAGE_IDS).map((id) => id.trim()).filter(Boolean)),
  ];
  assert.ok(ids.length > 0, 'Configure pelo menos um dashboard.');
  assert.ok(
    ids.every((id) => /^\d+$/.test(id)),
    'Os IDs dos dashboards devem ser numéricos.',
  );

  const positions = resolvePositions();
  const firstPrit =
    positions.find((position) => !position.testPlans && position.testPlanPrit)?.testPlanPrit ??
    getConfiguredExecutions(positions)[0]?.prit;
  assert.ok(firstPrit, 'Configure um Test Plan ou execution para reutilizar o login do Jira.');

  fs.mkdirSync('output', { recursive: true });
  const directory = fs.mkdtempSync(path.resolve('output', 'dashboard-test-'));
  console.log(`Resultados do teste: ${directory}`);
  const dashboards: DashboardData[] = [];
  const results: { pageId: string; status: string; total?: number; error?: string }[] = [];
  const { browser, page } = await createBrowserSession(firstPrit);

  try {
    for (const id of ids) {
      try {
        const dashboard = await extractDashboard(page, id);
        // Preserva os dados brutos mesmo se uma validação falhar.
        fs.writeFileSync(path.join(directory, `${id}.json`), JSON.stringify(dashboard, null, 2));
        assert.equal(dashboard.pageId, id);
        assert.match(dashboard.title, /\bOpen\s+Defects?\b/i);
        assert.equal(dashboard.total, dashboard.defects.length);
        assert.equal(new Set(dashboard.defects.map((defect) => defect.key)).size, dashboard.total);
        for (const defect of dashboard.defects) {
          assert.match(defect.key, /^[A-Za-z]+-\d+$/);
          assert.ok(defect.summary.trim(), `${defect.key}: summary vazio`);
          assert.ok(defect.status.trim(), `${defect.key}: status vazio`);
          assert.ok(
            ['Highest', 'High', 'Medium', 'Low', 'Lowest'].includes(defect.priority),
            `${defect.key}: prioridade não reconhecida (${defect.priority})`,
          );
        }
        dashboards.push(dashboard);
        results.push({ pageId: id, status: 'OK', total: dashboard.total });
        console.table(dashboard.defects);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push({ pageId: id, status: 'FALHOU', error: message });
        console.error(`Dashboard ${id}: ${message}`);
        process.exitCode = 1;
      }
    }
  } finally {
    fs.writeFileSync(path.join(directory, 'dashboards.json'), JSON.stringify(dashboards, null, 2));
    fs.writeFileSync(path.join(directory, 'validation.json'), JSON.stringify(results, null, 2));
    await browser.close();
  }
  console.table(results);
  console.log(`Confira os JSON em ${directory} com os valores apresentados no Jira.`);
  console.log(
    'As validações verificam os dados extraídos; a completude deve ser conferida no Jira.',
  );
}

main().catch((error: unknown) => {
  console.error('Falha no teste temporário de dashboards:', error);
  process.exitCode = 1;
});
