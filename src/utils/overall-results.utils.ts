import { TEST_PLANS } from '../config/operations.config';
import type { PositionReport, ReleaseLinks } from '../types/report.types';
import { normalizeStatus } from './html.utils';
import { normalizeTestPlanPrit } from './release-links.utils';

export type Market = 'PT' | 'SP';
export type MarketResults = { counts: Record<string, number>; total: number; executions: number };
export type OverallPlanResults = {
  key: string;
  prit: string;
  label: string;
  title: string;
  available: boolean;
  statuses: string[];
  markets: Record<Market, MarketResults>;
  warnings: string[];
};
export type OverallResults = { reportKey: string; plans: OverallPlanResults[]; warnings: string[] };

const planLabels: Record<string, string> = {
  smokes: 'Smokes', certification: 'Certification', regression: 'Regression', defectFixing: 'Defect Fixing',
};
const standardStatuses = ['PASS', 'TODO', 'EXECUTING', 'FAIL', 'ABORTED', 'BLOCKED', 'FOR_TESTING', 'PENDING_3RD'];

export function getExecutionMarket(title: string): Market | undefined {
  // Letras (incluindo acentos), marcas combinantes e números não são delimitadores.
  const matches = [...title.matchAll(/(?:^|[^\p{L}\p{M}\p{N}])(PT|SP)(?=$|[^\p{L}\p{M}\p{N}])/giu)];
  const markets = new Set(matches.map(match => match[1].toUpperCase() as Market));
  return markets.size === 1 ? [...markets][0] : undefined;
}

export function overallPercentage(count: number, total: number): string {
  return `${total ? (count * 100 / total).toFixed(1).replace(/\.0$/, '') : '0'}%`;
}

export function aggregateOverallResults(
  positions: PositionReport[],
  configured: ReleaseLinks['testPlans'] = TEST_PLANS,
): OverallResults {
  // Uma execução pode aparecer em mais de um grupo; conta uma vez em cada plano.
  const reports = new Map(positions.flatMap(position => position.reports)
    .map(report => [report.prit.trim().toUpperCase(), report]));
  const linkedExecutions = new Set<string>();
  const plans = Object.entries(configured).map(([key, plan]): OverallPlanResults => {
    const prit = normalizeTestPlanPrit(plan.prit);
    const warnings: string[] = [];
    const emptyMarket = (): MarketResults => ({ counts: Object.create(null), total: 0, executions: 0 });
    const markets = { PT: emptyMarket(), SP: emptyMarket() };
    const statuses = new Set(standardStatuses);
    const available = Boolean(prit && plan.executionPrits);
    if (!prit) warnings.push('PRIT do Test Plan não configurado.');
    else if (!available) warnings.push(`Vínculos de ${prit} indisponíveis. Não foi possível calcular os resultados deste plano.`);

    if (available) for (const executionPrit of new Set(plan.executionPrits!.map(value => value.trim().toUpperCase()))) {
      const report = reports.get(executionPrit);
      if (!report) continue; // O Overall usa exclusivamente os PRITs coletados.
      linkedExecutions.add(executionPrit);
      const market = getExecutionMarket(report.title);
      if (!market) {
        warnings.push(`${executionPrit}: título sem mercado PT/SP inequívoco; execução excluída do Overall.`);
        continue;
      }
      const result = markets[market];
      result.executions++;
      let executionTotal = 0;
      for (const item of report.executionStatuses) {
        const normalized = normalizeStatus(item.status);
        const status = normalized === 'TO_DO' ? 'TODO' : normalized;
        if (!status || !Number.isSafeInteger(item.quantidade) || item.quantidade < 0) {
          warnings.push(`${executionPrit}: status ou quantidade inválida; valor excluído do Overall.`);
          continue;
        }
        statuses.add(status);
        result.counts[status] = (result.counts[status] ?? 0) + item.quantidade;
        executionTotal += item.quantidade;
      }
      result.total += executionTotal;
      if (!report.executionStatuses.length && report.totalTests !== 0) {
        warnings.push(`${executionPrit}: status de execução não coletados; resultados deste mercado podem estar incompletos.`);
      } else if (report.totalTests !== null && report.totalTests !== executionTotal) {
        warnings.push(`${executionPrit}: soma dos status (${executionTotal}) difere do total informado (${report.totalTests}); percentuais calculados sobre os status coletados.`);
      }
    }
    return {
      key, prit, label: planLabels[key] ?? key, title: plan.title?.trim() || planLabels[key] || key,
      available, statuses: [...standardStatuses, ...[...statuses].filter(status => !standardStatuses.includes(status)).sort()],
      markets, warnings,
    };
  });
  const warnings = [...reports.keys()].filter(prit => !linkedExecutions.has(prit))
    .map(prit => `${prit}: nenhum vínculo confirmado com os Test Plans configurados; execução excluída do Overall.`);
  const reportKey = JSON.stringify({
    executions: [...reports.keys()].sort(),
    plans: plans.map(plan => [plan.key, plan.prit]).sort(([a], [b]) => a.localeCompare(b)),
  });
  return { reportKey, plans, warnings };
}
