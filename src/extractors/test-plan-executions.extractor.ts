import type { APIRequestContext } from 'playwright';
import { JIRA_URL } from '../config/jira.config';
import { TEST_PLANS } from '../config/operations.config';
import type { ReleaseLinks } from '../types/report.types';
import { normalizeTestPlanPrit } from '../utils/release-links.utils';

// Consulta somente os vínculos; não acrescenta execuções ao escopo de PRITS.
export async function extractTestPlanExecutions(
  request: APIRequestContext,
  configured: ReleaseLinks['testPlans'] = TEST_PLANS,
  jiraUrl = JIRA_URL,
): Promise<ReleaseLinks['testPlans']> {
  const plans = structuredClone(configured);
  const baseUrl = jiraUrl.replace(/\/+$/, '');
  Object.values(plans).forEach((plan) => {
    plan.prit = normalizeTestPlanPrit(plan.prit);
    delete plan.executionPrits;
  });

  async function readExecutions(prit: string): Promise<string[] | undefined> {
    try {
      const keys = new Set<string>();
      let startAt = 0;
      // A pesquisa é paginada para não truncar planos com mais de 100 execuções.
      while (true) {
        const response = await request.get(`${baseUrl}/rest/api/2/search`, {
          headers: { Accept: 'application/json' },
          params: {
            jql: `issue in testPlanTestExecutions("${prit}") ORDER BY key ASC`,
            fields: 'key',
            startAt,
            maxResults: 100,
          },
          timeout: 15000,
        });
        let data;
        try {
          if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
          data = await response.json();
        } finally {
          await response.dispose();
        }
        if (
          !data ||
          !Array.isArray(data.issues) ||
          !Number.isSafeInteger(data.total) ||
          data.total < 0 ||
          data.startAt !== startAt
        ) {
          throw new Error('Resposta de pesquisa inválida');
        }
        for (const issue of data.issues) {
          if (
            !issue ||
            typeof issue.key !== 'string' ||
            !/^[A-Z][A-Z0-9_]*-\d+$/i.test(issue.key)
          ) {
            throw new Error('Execução sem identificador válido');
          }
          const key = issue.key.toUpperCase();
          if (keys.has(key))
            throw new Error(
              'Paginação repetiu uma execução; a lista pode ter mudado durante a consulta',
            );
          keys.add(key);
        }
        startAt += data.issues.length;
        if (startAt >= data.total) return [...keys];
        if (!data.issues.length) throw new Error('Paginação incompleta');
      }
    } catch (error) {
      console.warn(
        `⚠️ Não foi possível obter as execuções de ${prit}; o Overall deste plano ficará indisponível.`,
        error instanceof Error ? error.message : String(error),
      );
      return undefined;
    }
  }

  const requests = new Map<string, Promise<string[] | undefined>>();
  await Promise.all(
    Object.values(plans).map(async (plan) => {
      if (!plan.prit) return;
      if (!requests.has(plan.prit)) requests.set(plan.prit, readExecutions(plan.prit));
      plan.executionPrits = await requests.get(plan.prit);
    }),
  );
  return plans;
}
