import { JIRA_URL } from '../config/jira.config';
import type { PositionReport, Report } from '../types/report.types';
import { escapeHtml } from '../utils/html.utils';

type ActivityColumn = 'done' | 'in-progress' | 'to-do' | 'other';
const cellStyle = 'padding:13px 12px;border:1px solid #dce5f0;vertical-align:top;';
const columns = {
  done: { symbol: '✓', color: '#00875a', background: '#f3fbf7' },
  'in-progress': { symbol: '↻', color: '#0052cc', background: '#f3f7ff' },
  'to-do': { symbol: '⌛', color: '#875e00', background: '#fffbef' },
  other: { symbol: '•', color: '#6b778c', background: '#f4f5f7' },
};

function normalizeStatus(status: string): string {
  return status.trim().replace(/[\s_-]+/g, ' ').toUpperCase();
}

function getColumn(status: string): ActivityColumn {
  switch (normalizeStatus(status)) {
    case 'DONE': case 'CLOSED': case 'RESOLVED': case 'COMPLETED':
      return 'done';
    case 'IN PROGRESS': case 'EXECUTING': case 'IN REVIEW': case 'IN TESTING':
    case 'TESTING': case 'FOR TESTING': case 'READY FOR QUALITY': case 'READY FOR APPROVAL':
      return 'in-progress';
    case 'OPEN': case 'TO DO': case 'TODO': case 'BACKLOG': case 'NEW':
      return 'to-do';
    default:
      return 'other';
  }
}

function shortTitle(title: string): string {
  // Conserva os qualificadores de grupo/release ao retirar os prefixos de versão e posto.
  return title.replace(/^(?:\s*\[[^\]]*\])+\s*[-–—:]?\s*/, '')
    .replace(/Installation Smoke Tests?/gi, 'Smoke')
    .replace(/Certification Group\s*["“]?(\d+)["”]?/gi, 'Certificação Grupo $1')
    .replace(/Regression (?:Group|Grupo)\s*["“]?(\d+)["”]?/gi, 'Regressão Grupo $1')
    .replace(/\bRegression\b/gi, 'Regressão')
    .replace(/Validation of the defects delivered in release/gi, 'Defect Fixing — release')
    .replace(/Validation Defect Fixing/gi, 'Defect Fixing')
    .trim() || title;
}

function renderActivity(report: Report, column: ActivityColumn): string {
  const url = `${JIRA_URL.replace(/\/$/, '')}/browse/${encodeURIComponent(report.prit)}`;
  const status = normalizeStatus(report.mainStatus);
  const showStatus = column === 'other'
    || (column === 'in-progress' && status !== 'IN PROGRESS');
  return `<div data-position-activity="${escapeHtml(report.prit)}" style="margin:0 0 8px;line-height:1.5;">
    <span aria-hidden="true" style="color:${columns[column].color};font-weight:bold;">${columns[column].symbol}</span>
    <a href="${escapeHtml(url)}" title="${escapeHtml(`${report.prit} — ${report.title}`)}"
      target="_blank" rel="noopener noreferrer" style="color:#172b4d;text-decoration:none;">${escapeHtml(shortTitle(report.title))}${column === 'done' ? '' : ` <span style="color:#0052cc;">(${escapeHtml(report.prit)})</span>`}</a>
    ${showStatus ? `<span style="color:#5e6c84;"> — ${escapeHtml(report.mainStatus.trim() || 'Sem status')}</span>` : ''}
  </div>`;
}

export function createPositionActivitiesTable(positions: PositionReport[]): string {
  const grouped = new Map<string, Map<string, { report: Report; statuses: Set<string> }>>();
  for (const position of positions) {
    const reports = grouped.get(position.position) ?? new Map<string, { report: Report; statuses: Set<string> }>();
    grouped.set(position.position, reports);
    for (const report of position.reports) {
      const key = report.prit.trim().toUpperCase();
      const existing = reports.get(key) ?? { report, statuses: new Set<string>() };
      existing.statuses.add(normalizeStatus(report.mainStatus) || 'SEM STATUS');
      reports.set(key, existing);
    }
  }
  const reportKey = JSON.stringify([...new Set(positions.flatMap(position =>
    position.reports.map(report => report.prit)
  ))].sort());
  const otherStates: string[] = [];
  const rows = [...grouped].map(([position, entries]) => {
    const reports = [...entries.values()].map(({ report, statuses }) => statuses.size === 1 ? report : {
      ...report, mainStatus: `Estados divergentes: ${[...statuses].sort().join(' / ')}`,
    });
    const other = reports.filter(report => getColumn(report.mainStatus) === 'other');
    if (other.length) otherStates.push(`<div style="margin:8px 0;">
      <strong>${escapeHtml(position)}</strong>${other.map(report => renderActivity(report, 'other')).join('')}
    </div>`);
    return `<tr data-activity-position="${escapeHtml(position)}">
      <th scope="row" style="${cellStyle}background:#edf3fc;color:#0747a6;text-align:left;">${escapeHtml(position)}</th>
      ${(['done', 'in-progress', 'to-do'] as const).map(column => {
        const activities = reports.filter(report => getColumn(report.mainStatus) === column);
        return `<td data-activity-column="${column}" style="${cellStyle}background:${columns[column].background};">${activities.length
          ? activities.map(report => renderActivity(report, column)).join('')
          : '<span style="color:#8993a4;" aria-label="Sem atividades neste estado">—</span>'}</td>`;
      }).join('')}
      <td style="${cellStyle}background:#fff5f3;">
        <textarea data-activity-note data-position="${escapeHtml(position)}" rows="3"
          aria-label="ON HOLD de ${escapeHtml(position)}" placeholder="Adicionar impedimentos ou observações..."></textarea>
      </td>
    </tr>`;
  }).join('');

  const headers = [
    { label: 'Postos', width: '12%', background: '#244779', color: '#ffffff' },
    { label: 'DONE', width: '24%', background: '#00875a', color: '#ffffff' },
    { label: 'IN PROGRESS', width: '23%', background: '#0052cc', color: '#ffffff' },
    { label: 'TO DO', width: '18%', background: '#ffcb47', color: '#463000' },
    { label: 'ON HOLD', width: '23%', background: '#c9372c', color: '#ffffff' },
  ];
  return `<section id="position-activities-section" aria-labelledby="position-activities-title" style="margin:0 0 32px;">
    <h2 id="position-activities-title" style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#142e57;">Atividades por posto</h2>
    <div id="position-activities-scroll" class="report-table-scroll" data-report-scroll tabindex="0" role="region" aria-label="Atividades por posto; desloque para ver todas as colunas">
      <table id="position-activities-table" class="report-summary-table" data-report-key="${escapeHtml(reportKey)}" aria-label="Atividades por posto" width="100%" cellpadding="0" cellspacing="0"
        style="width:100%;table-layout:fixed;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#172b4d;">
        <thead><tr>${headers.map(({ label, width, background, color }) => `<th scope="col" width="${width}" style="${cellStyle}width:${width};background:${background};color:${color};border-color:${background};text-align:left;">${label}</th>`).join('')}</tr></thead>
        <tbody>${rows || `<tr><td colspan="5" style="${cellStyle}color:#5e6c84;">Nenhuma atividade extraída do Jira para este relatório.</td></tr>`}</tbody>
      </table>
    </div>
    ${otherStates.length ? `<div data-other-activity-states style="margin-top:12px;font-size:14px;">
      <strong>Outros estados do Jira</strong>${otherStates.join('')}
    </div>` : ''}
  </section>`;
}
