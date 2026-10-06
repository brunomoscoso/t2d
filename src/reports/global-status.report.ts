import type { PositionReport } from '../types/report.types';
import { POSITIONS } from '../config/positions.config';
import { escapeHtml } from '../utils/html.utils';

const GLOBAL_STATUSES = [
  { value: 'completed', label: 'Concluído', color: '#22a06b' },
  { value: 'final-phase', label: 'Fase final', color: '#d9a400' },
  { value: 'in-progress', label: 'Em evolução', color: '#d9a400' },
  { value: 'regression', label: 'Regressão em curso', color: '#d9a400' },
  { value: 'awaiting-execution', label: 'A aguardar condições para execução', color: '#de350b' },
  { value: 'awaiting-installation', label: 'A aguardar instalação/execução', color: '#de350b' },
  { value: 'blocked', label: 'Bloqueado', color: '#de350b' },
];

export function createGlobalStatusTable(positions: PositionReport[]): string {
  // Inclui o catálogo completo e eventuais posições adicionais identificadas no Jira.
  const availablePositions = [...new Set([
    ...POSITIONS.map(position => position.name),
    ...positions.map(position => position.position),
  ])];

  const options = GLOBAL_STATUSES.map(status => `
    <option value="${status.value}" data-color="${status.color}">${escapeHtml(status.label)}</option>
  `).join('');

  // Mantém as escolhas ao reabrir o mesmo relatório, separando conjuntos de PRITs.
  const reportKey = JSON.stringify(positions.flatMap(position =>
    position.reports.map(report => report.prit)
  ).sort());

  const choices = availablePositions.map((position, index) => `
    <label class="global-position-choice">
      <input type="checkbox" data-position-toggle value="${escapeHtml(position)}"
        aria-controls="global-status-row-${index}" />
      <span>${escapeHtml(position)}</span>
    </label>
  `).join('');

  const rows = availablePositions.map((position, index) => `
    <tr id="global-status-row-${index}" data-global-status-row data-position="${escapeHtml(position)}" hidden>
      <th scope="row" style="padding:12px;border:1px solid #dce5f0;background:#edf3fc;text-align:left;font-size:14px;color:#0747a6;">
        ${escapeHtml(position)}
      </th>
      <td style="padding:10px 12px;border:1px solid #dce5f0;background:#ffffff;">
        <div class="global-status-fields">
          <span data-status-dot aria-hidden="true" style="color:#8993a4;font-size:20px;line-height:1;vertical-align:middle;">●</span>
          <select data-status-select aria-label="Estado global de ${escapeHtml(position)}">
            <option value="" data-color="#8993a4">Selecionar estado</option>
            ${options}
          </select>
          <input data-status-note type="text" maxlength="200"
            aria-label="Nota de ${escapeHtml(position)}"
            placeholder="Adicionar nota curta..." />
        </div>
      </td>
    </tr>
  `).join('');

  return `
    <div id="global-status-section" style="margin-bottom:32px;">
      <fieldset class="global-position-picker" data-editor-only>
        <legend>Selecione os postos</legend>
        <p>Marque os postos que pretende incluir no estado global.</p>
        <div class="global-position-options">${choices}</div>
        <div class="global-position-actions">
          <button type="button" data-select-all-positions>Selecionar todos</button>
          <button type="button" data-clear-positions>Limpar seleção</button>
          <span id="global-position-count" role="status">0 postos selecionados</span>
        </div>
      </fieldset>
      <h2 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#142e57;">Estado global</h2>
      <table id="global-status-table" class="report-summary-table" data-report-key="${escapeHtml(reportKey)}"
        aria-label="Estado global por posto" cellpadding="0" cellspacing="0"
        style="width:100%;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#172b4d;">
        <thead>
          <tr>
            <th scope="col" style="padding:13px 12px;border:1px solid #244779;background:#244779;color:#ffffff;width:150px;text-align:left;">Postos</th>
            <th scope="col" style="padding:13px 12px;border:1px solid #244779;background:#244779;color:#ffffff;text-align:left;">Estado Global</th>
          </tr>
        </thead>
        <tbody>
          <tr id="global-status-empty" data-editor-only>
            <th scope="row" style="padding:16px 12px;border:1px solid #dce5f0;background:#edf3fc;text-align:left;color:#42526e;">
              Posto a selecionar
            </th>
            <td style="padding:16px 12px;border:1px solid #dce5f0;background:#f8faff;color:#5e6c84;">
              <div class="global-status-fields" aria-hidden="true">
                <span style="color:#8993a4;font-size:20px;line-height:1;">●</span>
                <span class="global-status-placeholder">Estado do posto</span>
                <span class="global-status-placeholder global-status-placeholder-note">Observação curta...</span>
              </div>
              <p style="margin:8px 0 0;font-size:14px;">
                Os postos selecionados na lista aparecerão aqui.
              </p>
            </td>
          </tr>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}
