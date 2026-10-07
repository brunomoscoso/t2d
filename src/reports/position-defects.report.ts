import { JIRA_URL } from '../config/jira.config';
import type { PositionReport } from '../types/report.types';
import { escapeHtml } from '../utils/html.utils';

type AssociatedDefect = { key: string; createdInSprint: boolean };

function renderDefectLinks(defects: AssociatedDefect[]): string {
  if (!defects.length) return '<span style="color:#8993a4;" aria-label="Nenhum defect nesta categoria">—</span>';

  return `<div style="line-height:1.7;white-space:normal;overflow-wrap:anywhere;">
    ${defects.map(defect => `<a data-position-defect="${escapeHtml(defect.key)}"
        href="${escapeHtml(`${JIRA_URL.replace(/\/$/, '')}/browse/${encodeURIComponent(defect.key)}`)}"
        target="_blank" rel="noopener noreferrer"
        style="color:#0747a6;font-size:13px;text-decoration:underline;overflow-wrap:anywhere;">${escapeHtml(defect.key)}</a>`).join(', ')}
  </div>`;
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
        const defect = defects.get(key) ?? { key, createdInSprint: false };
        // A categoria "created" identifica os abertos na sprint, independentemente do status.
        // Prevalece se o mesmo PRIT tiver outras relações nas execuções deste posto.
        defect.createdInSprint ||= issue.relation.trim().toLowerCase() === 'created';
        defects.set(key, defect);
      }
    }
  }

  const cellStyle = 'padding:14px 12px;border:1px solid #dce5f0;vertical-align:top;text-align:left;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;';
  const rows = [...byPosition].filter(([, defects]) => defects.size).map(([position, defects]) => {
    const items = [...defects.values()].sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true }));
    const created = items.filter(defect => defect.createdInSprint);
    const other = items.filter(defect => !defect.createdInSprint);

    return `<tr data-defect-position="${escapeHtml(position)}">
      <th scope="row" style="${cellStyle}background:#edf3fc;color:#0747a6;">${escapeHtml(position)}</th>
      <td data-defect-column="created" style="${cellStyle}">${renderDefectLinks(created)}</td>
      <td data-defect-column="other" style="${cellStyle}">${renderDefectLinks(other)}</td>
      <td style="${cellStyle}text-align:center;"><strong data-defect-total style="display:inline-block;max-width:100%;padding:4px 3px;border-radius:8px;background:#e4eeff;color:#0747a6;font-size:14px;">${defects.size}</strong></td>
    </tr>`;
  }).join('');

  if (!rows) return '';

  return `
    <section id="position-defects-section" aria-labelledby="position-defects-title" style="margin:0 0 32px;">
      <h2 id="position-defects-title" style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#142e57;">Defects por posto</h2>
      <table id="position-defects-table" class="report-summary-table" aria-label="Defects por posto" width="100%" cellpadding="0" cellspacing="0"
        style="width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#172b4d;overflow-wrap:anywhere;">
        <thead><tr>
          <th scope="col" width="20%" style="${cellStyle}width:20%;border-color:#244779;background:#244779;color:#ffffff;">Postos</th>
          <th scope="col" width="33%" style="${cellStyle}width:33%;border-color:#244779;background:#244779;color:#ffffff;">Criados na sprint</th>
          <th scope="col" width="33%" style="${cellStyle}width:33%;border-color:#244779;background:#244779;color:#ffffff;">Demais defects</th>
          <th scope="col" width="14%" style="${cellStyle}width:14%;border-color:#244779;background:#244779;color:#ffffff;text-align:center;">Total</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}
