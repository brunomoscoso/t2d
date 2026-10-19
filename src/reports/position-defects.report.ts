import { JIRA_URL } from '../config/jira.config';
import type { IssueLink, PositionReport } from '../types/report.types';
import { escapeHtml, getIssueStatusColors } from '../utils/html.utils';

const priorities: Record<
  string,
  { label: string; color: string; background: string; rank: number }
> = {
  highest: { label: 'Crítica', color: '#ae2e24', background: '#ffedeb', rank: 0 },
  high: { label: 'Alta', color: '#a54800', background: '#fff3eb', rank: 1 },
  medium: { label: 'Média', color: '#875e00', background: '#fff7d6', rank: 2 },
  low: { label: 'Baixa', color: '#0747a6', background: '#e9f2ff', rank: 3 },
  lowest: { label: 'Muito baixa', color: '#216e4e', background: '#e3fcef', rank: 4 },
};
const unknownPriority = { label: 'Não definida', color: '#5e6c84', background: '#f1f2f4', rank: 5 };
const getPriority = (value: string) => priorities[value.trim().toLowerCase()] ?? unknownPriority;

type SprintDefect = {
  key: string;
  issue: IssueLink;
  positions: Set<string>;
};

export function createPositionDefectsSection(positions: PositionReport[]): string {
  const defects = new Map<string, SprintDefect>();
  // Só a relação "created" identifica os defects criados nesta sprint.
  for (const position of positions) {
    for (const report of position.reports) {
      for (const issue of report.issueLinks) {
        const key = issue.prit.trim().toUpperCase();
        if (!key || issue.relation.trim().toLowerCase() !== 'created') continue;
        if (!defects.has(key)) {
          defects.set(key, {
            key,
            issue: { ...issue },
            positions: new Set(),
          });
        } else {
          const saved = defects.get(key)!.issue;
          if (!saved.titulo.trim()) saved.titulo = issue.titulo;
          if (!saved.status.trim()) saved.status = issue.status;
          if (getPriority(saved.priority) === unknownPriority) saved.priority = issue.priority;
        }
      }
    }
  }

  // Um defect partilhado aparece uma só vez, com as posições configuradas das
  // execuções que o referenciam. Tags do título (incluindo PROD) são só exibição.
  for (const position of positions) {
    for (const report of position.reports) {
      for (const issue of report.issueLinks) {
        const defect = defects.get(issue.prit.trim().toUpperCase());
        if (!defect) continue;
        defect.positions.add(position.position);
      }
    }
  }

  const positionOrder = positions.map((position) => position.position);
  const sorted = [...defects.values()]
    .filter((defect) => getPriority(defect.issue.priority).rank <= 1)
    .sort(
      (a, b) =>
        getPriority(a.issue.priority).rank - getPriority(b.issue.priority).rank ||
        a.key.localeCompare(b.key, undefined, { numeric: true }),
    );
  const cellStyle =
    'padding:13px 12px;border:1px solid #dce5f0;vertical-align:top;text-align:left;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;';
  const badgeStyle =
    'display:inline-block;box-sizing:border-box;max-width:100%;padding:4px;border-radius:6px;font-size:11px;font-weight:bold;line-height:1.5;white-space:normal;word-wrap:break-word;overflow-wrap:anywhere;';
  const rows = sorted
    .map((defect, index) => {
      const priority = getPriority(defect.issue.priority);
      const statusColors = getIssueStatusColors(defect.issue.status);
      const names = [...defect.positions].sort((a, b) => {
        const index = (name: string) =>
          positionOrder.includes(name) ? positionOrder.indexOf(name) : positionOrder.length;
        return index(a) - index(b) || a.localeCompare(b);
      });
      const summary = defect.issue.titulo.trim() || 'Sem resumo';
      const status =
        defect.issue.status
          .trim()
          .replace(/[_-]+/g, ' ')
          .toLowerCase()
          .replace(/\b\w/g, (character) => character.toUpperCase()) || 'Sem estado';
      return `<tr data-sprint-defect="${escapeHtml(defect.key)}" data-report-positions="${escapeHtml(JSON.stringify(names))}" style="background:${index % 2 ? '#f8faff' : '#ffffff'};">
      <td data-defect-priority style="${cellStyle}"><span style="${badgeStyle}background:${priority.background};color:${priority.color};"><span aria-hidden="true">●</span> ${priority.label}</span></td>
      <td style="${cellStyle}"><a data-position-defect="${escapeHtml(defect.key)}"
        href="${escapeHtml(`${JIRA_URL.replace(/\/$/, '')}/browse/${encodeURIComponent(defect.key)}`)}"
        target="_blank" rel="noopener noreferrer" style="color:#0747a6;font-weight:bold;text-decoration:underline;">${escapeHtml(defect.key)}</a></td>
      <td data-defect-positions style="${cellStyle}background:#edf3fc;color:#0747a6;font-weight:bold;">${escapeHtml(names.join(', '))}</td>
      <td data-defect-summary style="${cellStyle}">${escapeHtml(summary)}</td>
      <td data-defect-status style="${cellStyle}"><span style="${badgeStyle}background:${statusColors.background};color:${statusColors.color};border:1px solid ${statusColors.border};">${escapeHtml(status)}</span></td>
    </tr>`;
    })
    .join('');
  const headers = [
    { label: 'Prioridade', width: '13%' },
    { label: 'PRIT', width: '15%' },
    { label: 'Posições das execuções', width: '18%' },
    { label: 'Resumo', width: '41%' },
    { label: 'Estado', width: '13%' },
  ];
  return `<section id="position-defects-section" data-position-section ${rows ? '' : 'hidden'} aria-labelledby="position-defects-title" style="margin:0 0 32px;">
    <h2 id="position-defects-title" style="margin:0 0 14px;font-size:14px;line-height:1.3;color:#142e57;">Defects criados na sprint</h2>
    <table id="position-defects-table" class="report-summary-table" aria-label="Defects criados na sprint" width="100%" cellpadding="0" cellspacing="0"
      style="width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#172b4d;overflow-wrap:anywhere;">
      <thead><tr>${headers.map(({ label, width }) => `<th scope="col" width="${width}" style="${cellStyle}width:${width};border-color:#244779;background:#244779;color:#ffffff;font-weight:bold;">${label}</th>`).join('')}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}
