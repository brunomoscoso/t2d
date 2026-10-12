import type { PositionReport } from '../types/report.types';
import { escapeHtml } from '../utils/html.utils';

export function createMainBlockersTable(positions: PositionReport[]): string {
  const reportKey = JSON.stringify(
    positions.flatMap((position) => position.reports.map((report) => report.prit)).sort(),
  );
  const columns = [
    { field: 'theme', label: 'Tema', width: '45%' },
    { field: 'impact', label: 'Impacto', width: '55%' },
  ];
  const cellStyle =
    'padding:12px;border:1px solid #dce5f0;text-align:left;vertical-align:top;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;';
  const rows = Array.from(
    { length: 1 },
    (_, index) => `
    <tr data-blocker-row="${index}" style="background:${index % 2 ? '#f8faff' : '#ffffff'};">
      ${columns
        .map(
          ({ field, label }) => `<td style="${cellStyle}">
        <textarea data-blocker-field="${field}" rows="2" placeholder="--"
          aria-label="${label} do bloqueador ${index + 1}" style="min-height:64px;"></textarea>
        ${
          field === 'theme'
            ? `<button type="button" data-remove-blocker data-editor-only
          aria-label="Remover bloqueador ${index + 1}">Remover</button>`
            : ''
        }
      </td>`,
        )
        .join('')}
    </tr>
  `,
  ).join('');
  return `<section id="main-blockers-section" aria-labelledby="main-blockers-title" style="margin:0 0 32px;">
    <h2 id="main-blockers-title" style="margin:0 0 14px;font-size:14px;line-height:1.3;color:#142e57;">Principais bloqueadores</h2>
    <table id="main-blockers-table" class="report-summary-table" data-report-key="${escapeHtml(reportKey)}"
      aria-label="Principais bloqueadores" width="100%" cellpadding="0" cellspacing="0"
      style="width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#172b4d;">
      <thead><tr>${columns.map(({ label, width }) => `<th scope="col" width="${width}" style="${cellStyle}width:${width};border-color:#244779;background:#244779;color:#ffffff;">${label}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="blocker-actions" data-editor-only>
      <button type="button" data-add-blocker>Adicionar bloqueador</button>
    </div>
  </section>`;
}
