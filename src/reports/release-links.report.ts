import { JIRA_URL } from '../config/jira.config';
import type { ReleaseLinks } from '../types/report.types';
import { escapeHtml } from '../utils/html.utils';
import { getConfiguredReleaseLinks } from '../utils/release-links.utils';
import { normalizePrit } from '../utils/prit.utils';

export function createReleaseLinksSection(
  links: ReleaseLinks = getConfiguredReleaseLinks(),
): string {
  const baseUrl = JIRA_URL.replace(/\/+$/, '');

  function row(
    label: string,
    href: string,
    text: string,
    index: number,
    position?: string,
  ): string {
    const cellStyle =
      'padding:14px 16px;text-align:left;vertical-align:middle;line-height:1.5;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;';
    const border = index ? 'border-top:1px solid #dce5f0;' : '';
    const content = href
      ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color:#0052cc;text-decoration:none;font-weight:500;">${escapeHtml(text)}</a>`
      : '<span style="color:#5e6c84;">Não informado</span>';
    return `<tr ${position === undefined ? 'data-position-independent' : `data-report-position="${escapeHtml(position)}"`}>
      <th scope="row" style="${cellStyle}${border}border-right:1px solid #dce5f0;background:#edf3fc;color:#0747a6;font-weight:bold;">${escapeHtml(label)}</th>
      <td style="${cellStyle}${border}background:${index % 2 ? '#f8faff' : '#ffffff'};">${content}</td>
    </tr>`;
  }

  const rows = links.testPlans.map((plan, index) => {
    const label = `Test Plan — ${plan.position}`;
    const prit = plan.prit.trim() ? normalizePrit(plan.prit) : '';
    if (!prit) return row(label, '', '', index, plan.position);
    const title = plan.title?.trim();
    return row(
      label,
      `${baseUrl}/browse/${encodeURIComponent(prit)}`,
      title ? `[${prit}] ${title}` : `[${prit}]`,
      index,
      plan.position,
    );
  });

  const dashboardPageId = links.dashboardPageId.trim();
  rows.push(
    row(
      'Dashboard da release',
      dashboardPageId
        ? `${baseUrl}/secure/Dashboard.jspa?selectPageId=${encodeURIComponent(dashboardPageId)}`
        : '',
      links.dashboardTitle?.trim() || `Dashboard ${dashboardPageId}`,
      rows.length,
    ),
  );

  return `<section id="release-links-section" data-position-section aria-labelledby="release-links-title" style="margin:0 0 20px;font-family:Arial,Helvetica,sans-serif;color:#172b4d;">
    <h2 id="release-links-title" style="margin:0 0 10px;font-size:14px;line-height:1.3;color:#142e57;">Links da release</h2>
    <table id="release-links-table" class="report-summary-table" aria-label="Planos de teste e dashboard da release" width="100%" cellpadding="0" cellspacing="0"
      style="width:100%;max-width:100%;table-layout:fixed;border:1px solid #dce5f0;border-spacing:0;border-collapse:separate;border-radius:10px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;">
      <thead><tr>
        <th scope="col" width="28%" style="width:28%;padding:13px 16px;background:#244779;color:#ffffff;text-align:left;border-top-left-radius:9px;">Recurso</th>
        <th scope="col" style="padding:13px 16px;background:#244779;color:#ffffff;text-align:left;border-top-right-radius:9px;">Referência no Jira</th>
      </tr></thead>
      <tbody>${rows.join('\n')}</tbody>
    </table>
  </section>`;
}
