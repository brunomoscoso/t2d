import { JIRA_URL } from '../config/jira.config';
import { TEST_TYPE_LABELS } from '../config/test-types.config';
import { escapeHtml, getStatusColors } from '../utils/html.utils';
import {
  overallPercentage,
  type OverallResults,
} from '../utils/overall-results.utils';

export const overallResultsStyles = `
  .overall-results-table { min-width:720px; }
  #overall-results-section [hidden] { display:none !important; }
  @media print {
    .overall-results-table { min-width:0; }
    #overall-results-section [data-report-scroll] { overflow:visible; }
  }
`;

function renderWarnings(warnings: string[]): string {
  return warnings.length
    ? `<ul style="margin:12px 0;padding-left:22px;color:#875e00;font-size:11px;line-height:1.5;">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`
    : '';
}

export function createOverallResultsSection(overall: OverallResults): string {
  const cellStyle =
    'padding:7px 6px;border:1px solid #dce5f0;text-align:center;vertical-align:middle;overflow-wrap:anywhere;';
  const tables = overall.plans
    .map((plan, index) => {
      const headers = plan.statuses
        .map((status) => {
          const colors = getStatusColors(status);
          return `<th scope="col" style="${cellStyle}background:${colors.background};color:${colors.color};">${escapeHtml(status)}</th>`;
        })
        .join('');
      const rows = plan.types
        .map((result) => {
          const cells = [...plan.statuses, null]
            .map((status) => {
              const count = status === null ? result.total : (result.counts[status] ?? 0);
              return `<td ${status === null ? 'data-overall-total' : `data-overall-status="${escapeHtml(status)}"`} style="${cellStyle}background:${status === null ? '#edf3fc' : '#ffffff'};">
          <strong style="font-size:14px;line-height:1.3;color:#172b4d;">${result.available ? count : '—'}</strong><br />
          <span style="font-size:11px;line-height:1.3;color:#5e6c84;">${result.available ? overallPercentage(count, result.total) : '—'}</span>
        </td>`;
            })
            .join('');
          return `<tr data-overall-test-type="${result.testType}">
        <th scope="row" style="${cellStyle}background:#edf3fc;color:#0747a6;">${escapeHtml(TEST_TYPE_LABELS[result.testType])}${!result.available ? '<br /><span style="font-size:11px;font-weight:normal;">Dados indisponíveis</span>' : ''}</th>${cells}
      </tr>`;
        })
        .join('');
      const reference = plan.prit
        ? `<a href="${escapeHtml(`${JIRA_URL.replace(/\/+$/, '')}/browse/${encodeURIComponent(plan.prit)}`)}" target="_blank" rel="noopener noreferrer" style="color:#0052cc;">${escapeHtml(plan.prit)}</a>`
        : 'PRIT não configurado';
      return `<div id="overall-position-${encodeURIComponent(plan.key)}" data-overall-position="${escapeHtml(plan.key)}" data-report-position="${escapeHtml(plan.key)}" style="margin:0 0 24px;">
      <h3 id="overall-position-title-${index}" style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#142e57;">${escapeHtml(plan.label)} — ${reference}</h3>
      ${plan.title !== plan.label ? `<p style="font-size:11px;color:#5e6c84;">${escapeHtml(plan.title)}</p>` : ''}
      <div class="report-table-scroll" data-report-scroll tabindex="0" role="region" aria-label="${escapeHtml(plan.label)}; desloque para ver todas as colunas">
        <table class="report-summary-table overall-results-table" aria-labelledby="overall-position-title-${index}" width="100%" cellpadding="0" cellspacing="0"
          style="width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.35;">
          <thead><tr><th scope="col" style="${cellStyle}background:#244779;color:#ffffff;">Tipo de teste</th>${headers}<th scope="col" style="${cellStyle}background:#244779;color:#ffffff;">Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      ${renderWarnings(plan.warnings)}
    </div>`;
    })
    .join('');
  return `<section id="overall-results-section" data-position-section ${tables ? '' : 'hidden'} aria-labelledby="overall-results-title" style="margin:0 0 32px;font-family:Arial,Helvetica,sans-serif;">
    <h2 id="overall-results-title" style="margin:0 0 14px;font-size:14px;line-height:1.3;color:#142e57;">Overall Test Results</h2>
    ${tables}
  </section>`;
}
