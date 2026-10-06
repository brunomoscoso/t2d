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
      <th scope="row" style="padding:7px 10px;border:1px solid #dfe1e6;background:#f4f5f7;text-align:left;font-size:14px;">
        ${escapeHtml(position)}
      </th>
      <td style="padding:6px 10px;border:1px solid #dfe1e6;">
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
    <div id="global-status-section" style="margin-bottom:28px;">
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
      <p id="global-status-help" data-editor-only style="margin:0 0 8px;font-size:14px;font-weight:bold;">
        Defina o estado e as observações de cada posto selecionado
      </p>
      <table id="global-status-table" data-report-key="${escapeHtml(reportKey)}"
        aria-label="Estado global por posto" cellpadding="0" cellspacing="0"
        style="width:100%;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#172b4d;">
        <thead>
          <tr>
            <th scope="col" style="padding:7px 10px;border:1px solid #dfe1e6;background:#f4f5f7;width:150px;">Postos</th>
            <th scope="col" style="padding:7px 10px;border:1px solid #dfe1e6;background:#f4f5f7;">Estado Global</th>
          </tr>
        </thead>
        <tbody>
          <tr id="global-status-empty" data-editor-only>
            <th scope="row" style="padding:12px 10px;border:1px solid #dfe1e6;background:#f4f5f7;text-align:left;color:#5e6c84;">
              Posto a selecionar
            </th>
            <td style="padding:12px 10px;border:1px solid #dfe1e6;background:#fafbfc;color:#5e6c84;">
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
