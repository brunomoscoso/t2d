import type { APIRequestContext } from 'playwright';
import { JIRA_URL } from '../config/jira.config';
import { DASHBOARD_PAGE_ID, TEST_PLANS } from '../config/operations.config';
import type { ReleaseLinks } from '../types/report.types';
import { normalizeTestPlanPrit } from '../utils/release-links.utils';

type JiraTitleData = { fields?: { summary?: unknown }; name?: unknown } | null;

// O request do contexto do navegador partilha a sessão autenticada no Jira.
// O nome do dashboard é independente do título do gadget de Open Defects.
export async function extractReleaseLinks(
  request: APIRequestContext,
  configured: ReleaseLinks = { testPlans: TEST_PLANS, dashboardPageId: DASHBOARD_PAGE_ID },
  jiraUrl = JIRA_URL,
): Promise<ReleaseLinks> {
  const baseUrl = jiraUrl.replace(/\/+$/, '');
  const links = structuredClone(configured);
  const plans = Object.values(links.testPlans);
  plans.forEach(plan => {
    plan.prit = normalizeTestPlanPrit(plan.prit);
    delete plan.title;
  });
  links.dashboardPageId = links.dashboardPageId.trim();
  delete links.dashboardTitle;

  async function readTitle(path: string, label: string, pick: (data: JiraTitleData) => unknown): Promise<string | undefined> {
    try {
      const response = await request.get(`${baseUrl}${path}`, {
        headers: { Accept: 'application/json' },
        timeout: 15000,
      });
      try {
        if (!response.ok()) throw new Error(`HTTP ${response.status()}`);
        const title = pick(await response.json());
        if (typeof title !== 'string' || !title.trim()) throw new Error('Título ausente na resposta do Jira');
        return title.trim();
      } finally {
        await response.dispose();
      }
    } catch (error) {
      console.warn(`⚠️ Não foi possível obter o título de ${label}; o link será mantido pelo identificador.`,
        error instanceof Error ? error.message : String(error));
      return undefined;
    }
  }

  const titles = new Map<string, Promise<string | undefined>>();
  await Promise.all([
    ...plans.map(async plan => {
      if (!plan.prit) return;
      if (!titles.has(plan.prit)) {
        titles.set(plan.prit, readTitle(`/rest/api/2/issue/${encodeURIComponent(plan.prit)}?fields=summary`,
          plan.prit, data => data?.fields?.summary));
      }
      plan.title = await titles.get(plan.prit);
    }),
    (async () => {
      if (!links.dashboardPageId) return;
      links.dashboardTitle = await readTitle(`/rest/api/2/dashboard/${encodeURIComponent(links.dashboardPageId)}`,
        `Dashboard ${links.dashboardPageId}`, data => data?.name);
    })(),
  ]);
  return links;
}
