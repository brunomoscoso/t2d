import { DASHBOARD_PAGE_ID, TEST_PLANS } from '../config/operations.config';
import { JIRA_URL } from '../config/jira.config';
import type { ReleaseLinks } from '../types/report.types';
import { escapeHtml } from '../utils/html.utils';
import { normalizeTestPlanPrit } from '../utils/release-links.utils';

export function createReleaseLinksSection(links: ReleaseLinks = {
  testPlans: TEST_PLANS,
  dashboardPageId: DASHBOARD_PAGE_ID,
}): string {
  const baseUrl = JIRA_URL.replace(/\/+$/, '');
  const labels = [
    ['smokes', 'Test Plan de Smokes'],
    ['certification', 'Test Plan de Certificação'],
    ['regression', 'Test Plan de Regressão'],
    ['defectFixing', 'Test Plan de Defect Fixing'],
  ] as const;

  function row(label: string, href: string, text: string, index: number): string {
    const cellStyle = 'padding:14px 16px;text-align:left;vertical-align:middle;line-height:1.5;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;';
    const border = index ? 'border-top:1px solid #dce5f0;' : '';
    const content = href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#0052cc;text-decoration:none;font-weight:500;">${escapeHtml(text)}</a>`
      : '<span style="color:#5e6c84;">Não informado</span>';
    return `<tr>
      <th scope="row" style="${cellStyle}${border}border-right:1px solid #dce5f0;background:#edf3fc;color:#0747a6;font-weight:bold;">${escapeHtml(label)}</th>
      <td style="${cellStyle}${border}background:${index % 2 ? '#f8faff' : '#ffffff'};">${content}</td>
    </tr>`;
  }

  const rows = labels.map(([key, label], index) => {
    const plan = links.testPlans[key];
    const prit = normalizeTestPlanPrit(plan.prit);
    if (!prit) return row(label, '', '', index);
    const title = plan.title?.trim();
    return row(label, `${baseUrl}/browse/${encodeURIComponent(prit)}`, title ? `[${prit}] ${title}` : `[${prit}]`, index);
  });

  const dashboardPageId = links.dashboardPageId.trim();
  rows.push(row('Dashboard da release', dashboardPageId
    ? `${baseUrl}/secure/Dashboard.jspa?selectPageId=${encodeURIComponent(dashboardPageId)}`
    : '', links.dashboardTitle?.trim() || `Dashboard ${dashboardPageId}`, rows.length));

  return `<section id="release-links-section" aria-labelledby="release-links-title" style="margin:0 0 32px;font-family:Arial,Helvetica,sans-serif;color:#172b4d;">
    <h2 id="release-links-title" style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#142e57;">Links da release</h2>
    <table id="release-links-table" class="report-summary-table" aria-label="Planos de teste e dashboard da release" width="100%" cellpadding="0" cellspacing="0"
      style="width:100%;max-width:100%;table-layout:fixed;border:1px solid #dce5f0;border-spacing:0;border-collapse:separate;border-radius:10px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;">
      <thead><tr>
        <th scope="col" width="28%" style="width:28%;padding:13px 16px;background:#244779;color:#ffffff;text-align:left;border-top-left-radius:9px;">Recurso</th>
        <th scope="col" style="padding:13px 16px;background:#244779;color:#ffffff;text-align:left;border-top-right-radius:9px;">Referência no Jira</th>
      </tr></thead>
      <tbody>${rows.join('\n')}</tbody>
    </table>
  </section>`;
}
