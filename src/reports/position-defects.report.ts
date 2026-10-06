import { JIRA_URL } from '../config/jira.config';
import type { PositionReport } from '../types/report.types';
import { escapeHtml } from '../utils/html.utils';

const GROUPS = {
  open: { label: 'Abertos / bloqueados', color: '#c9372c' },
  ongoing: { label: 'Em curso / validação', color: '#875e00' },
  done: { label: 'Concluídos', color: '#16834a' },
  other: { label: 'Outros / sem status', color: '#6b778c' },
};
type DefectGroup = keyof typeof GROUPS;
type AssociatedDefect = { key: string; statuses: Set<string> };

function normalizeStatus(status: string): string {
  return status.trim().replace(/[\s_-]+/g, ' ').toUpperCase();
}

function getGroup(status: string): DefectGroup {
  switch (status) {
    case 'OPEN': case 'NEW': case 'TO DO': case 'TODO': case 'REOPENED':
    case 'BLOCKED': case 'ON HOLD':
      return 'open';
    case 'IN PROGRESS': case 'EXECUTING': case 'IN REVIEW': case 'IN TESTING':
    case 'TESTING': case 'FOR TESTING': case 'READY FOR QUALITY': case 'READY FOR APPROVAL':
    case 'PENDING 3RD':
      return 'ongoing';
    case 'DONE': case 'CLOSED': case 'RESOLVED': case 'COMPLETED':
      return 'done';
    default:
      return 'other';
  }
}

export function createPositionDefectsSection(positions: PositionReport[]): string {
  const byPosition = new Map<string, Map<string, AssociatedDefect>>();
  for (const position of positions) {
    const defects = byPosition.get(position.position) ?? new Map<string, AssociatedDefect>();
    byPosition.set(position.position, defects);
    // Reutiliza os Issue Links do bloco Defect Status, sem inferir associações pelo título.
    for (const report of position.reports) {
      for (const issue of report.issueLinks) {
        const key = issue.prit.trim().toUpperCase();
        if (!key) continue;
        const defect = defects.get(key) ?? { key, statuses: new Set<string>() };
        const status = normalizeStatus(issue.status);
        if (status) defect.statuses.add(status);
        defects.set(key, defect);
      }
    }
  }

  const cellStyle = 'padding:14px 12px;border:1px solid #dce5f0;vertical-align:top;text-align:left;';
  const order: DefectGroup[] = ['open', 'ongoing', 'other', 'done'];
  const rows = [...byPosition].filter(([, defects]) => defects.size).map(([position, defects]) => {
    const counts: Record<DefectGroup, number> = { open: 0, ongoing: 0, done: 0, other: 0 };
    const items = [...defects.values()].map(defect => {
      // Não atribui um estado arbitrário quando as execuções têm dados divergentes.
      const status = defect.statuses.size > 1
        ? `ESTADOS DIVERGENTES: ${[...defect.statuses].sort().join(' / ')}`
        : [...defect.statuses][0] || 'SEM STATUS';
      const group = getGroup(status);
      counts[group]++;
      return { ...defect, status, group };
    }).sort((a, b) => {
      return order.indexOf(a.group) - order.indexOf(b.group)
        || a.key.localeCompare(b.key, undefined, { numeric: true });
    });

    const groups = order.filter(group => counts[group]).map(group => `
      <div data-defect-group="${group}" style="margin:0 0 12px;line-height:1.5;">
        <div data-defect-count="${group}" style="margin-bottom:6px;font-size:13px;font-weight:bold;color:${GROUPS[group].color};">
          <span aria-hidden="true">●</span> ${GROUPS[group].label} (<strong>${counts[group]}</strong>)
        </div>
        ${items.filter(defect => defect.group === group).map(defect => `
          <a data-position-defect="${escapeHtml(defect.key)}"
            href="${escapeHtml(`${JIRA_URL.replace(/\/$/, '')}/browse/${encodeURIComponent(defect.key)}`)}"
            title="${escapeHtml(defect.status)}" aria-label="${escapeHtml(`${defect.key}: ${defect.status}`)}"
            target="_blank" rel="noopener noreferrer"
            style="display:inline-block;max-width:100%;margin:0 5px 5px 0;padding:3px 8px;border:1px solid #cbdcfa;border-radius:6px;background:#edf4ff;color:#0747a6;font-size:13px;font-weight:bold;text-decoration:none;overflow-wrap:anywhere;">${escapeHtml(defect.key)}</a>
        `).join(' ')}
      </div>`).join('');

    return `<tr data-defect-position="${escapeHtml(position)}">
      <th scope="row" style="${cellStyle}background:#edf3fc;color:#0747a6;">${escapeHtml(position)}</th>
      <td style="${cellStyle}">${groups}</td>
      <td style="${cellStyle}text-align:center;"><strong data-defect-total style="display:inline-block;padding:5px 8px;border-radius:8px;background:#e4eeff;color:#0747a6;font-size:17px;">${defects.size}</strong></td>
    </tr>`;
  }).join('');

  if (!rows) return '';

  return `
    <section id="position-defects-section" aria-labelledby="position-defects-title" style="margin:0 0 32px;">
      <h2 id="position-defects-title" style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#142e57;">Defects por posto</h2>
      <table id="position-defects-table" class="report-summary-table" aria-label="Defects por posto" width="100%" cellpadding="0" cellspacing="0"
        style="width:100%;table-layout:fixed;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#172b4d;overflow-wrap:anywhere;">
        <thead><tr>
          <th scope="col" width="150" style="${cellStyle}width:150px;border-color:#244779;background:#244779;color:#ffffff;">Postos</th>
          <th scope="col" style="${cellStyle}border-color:#244779;background:#244779;color:#ffffff;">Defects</th>
          <th scope="col" width="64" style="${cellStyle}width:64px;border-color:#244779;background:#244779;color:#ffffff;text-align:center;">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}
