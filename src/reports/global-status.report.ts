import type { PositionReport } from '../types/report.types';
import { escapeHtml } from '../utils/html.utils';
import { getPositionReportKey } from '../utils/position.utils';

const GLOBAL_STATUSES = [
  { value: 'completed', label: 'Concluído', color: '#22a06b' },
  { value: 'final-phase', label: 'Fase final', color: '#d9a400' },
  { value: 'in-progress', label: 'Em evolução', color: '#d9a400' },
  { value: 'regression', label: 'Regressão em curso', color: '#d9a400' },
  { value: 'awaiting-execution', label: 'A aguardar condições para execução', color: '#de350b' },
  { value: 'awaiting-installation', label: 'A aguardar instalação/execução', color: '#de350b' },
  { value: 'blocked', label: 'Bloqueado', color: '#de350b' },
];

function getDefaultSelection(positions: PositionReport[]): Set<string> {
  return new Set(
    positions
      .filter((position) => position.testPlanPrit.trim() || position.reports.length)
      .map((position) => position.position),
  );
}

export function createPositionPicker(positions: PositionReport[]): string {
  const selected = getDefaultSelection(positions);
  const choices = positions
    .map((position) => position.position)
    .map(
      (position, index) => `
    <label class="global-position-choice">
      <input type="checkbox" data-position-toggle value="${escapeHtml(position)}" ${selected.has(position) ? 'checked' : ''}
        aria-controls="global-status-row-${index} overall-position-${encodeURIComponent(position)}" />
      <span>${escapeHtml(position)}</span>
    </label>
  `,
    )
    .join('');

  return `
    <div id="position-picker-section" data-editor-only>
      <fieldset class="global-position-picker" data-editor-only>
        <legend>Selecione os postos</legend>
        <p>Marque os postos que pretende incluir em todas as áreas do relatório.</p>
        <div class="global-position-options">${choices}</div>
        <div class="global-position-actions">
          <button type="button" data-select-all-positions>Selecionar todos</button>
          <button type="button" data-clear-positions>Limpar seleção</button>
          <span id="global-position-count" role="status" aria-live="polite">${selected.size} ${selected.size === 1 ? 'posto selecionado' : 'postos selecionados'}</span>
        </div>
      </fieldset>
    </div>`;
}

export function createGlobalStatusTable(positions: PositionReport[]): string {
  const availablePositions = positions.map((position) => position.position);
  const selected = getDefaultSelection(positions);
  const reportKey = getPositionReportKey(positions);
  const options = GLOBAL_STATUSES.map(
    (status) =>
      `<option value="${status.value}" data-color="${status.color}">${escapeHtml(status.label)}</option>`,
  ).join('');
  const rows = availablePositions
    .map(
      (position, index) => `
    <tr id="global-status-row-${index}" data-global-status-row data-position="${escapeHtml(position)}" data-report-position="${escapeHtml(position)}" ${selected.has(position) ? '' : 'hidden'}>
      <th scope="row" style="padding:12px;border:1px solid #dce5f0;background:#edf3fc;text-align:left;font-size:11px;color:#0747a6;">
        ${escapeHtml(position)}
      </th>
      <td style="padding:10px 12px;border:1px solid #dce5f0;background:#ffffff;">
        <div class="installation-status-fields">
          <span data-installation-dot aria-hidden="true" style="color:#8993a4;font-size:14px;line-height:1;vertical-align:middle;">●</span>
          <select data-installation-select aria-label="Status de instalação de ${escapeHtml(position)}">
            <option value="" data-color="#8993a4">--</option>
            <option value="ok" data-color="#22a06b">OK</option>
            <option value="nok" data-color="#de350b">NOK</option>
          </select>
          <input data-installation-version type="text" maxlength="100"
            aria-label="Versão instalada de ${escapeHtml(position)}"
            placeholder="Versão instalada" title="Versão instalada (opcional)" />
        </div>
      </td>
      <td style="padding:10px 12px;border:1px solid #dce5f0;background:#ffffff;">
        <div class="global-status-fields">
          <span data-status-dot aria-hidden="true" style="color:#8993a4;font-size:14px;line-height:1;vertical-align:middle;">●</span>
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
  `,
    )
    .join('');

  return `
    <div id="global-status-section" data-position-section ${selected.size ? '' : 'hidden'} style="margin-bottom:32px;">
      <h2 style="margin:0 0 14px;font-size:14px;line-height:1.3;color:#142e57;">Estado global</h2>
      <table id="global-status-table" class="report-summary-table" data-report-key="${escapeHtml(reportKey)}"
        aria-label="Estado global por posto" cellpadding="0" cellspacing="0"
        style="width:100%;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#172b4d;">
        <thead>
          <tr>
            <th scope="col" width="16%" style="padding:13px 12px;border:1px solid #244779;background:#244779;color:#ffffff;width:16%;text-align:left;overflow-wrap:anywhere;">Postos</th>
            <th scope="col" width="34%" style="padding:13px 12px;border:1px solid #244779;background:#244779;color:#ffffff;width:34%;text-align:left;overflow-wrap:anywhere;">Status de instalação</th>
            <th scope="col" style="padding:13px 12px;border:1px solid #244779;background:#244779;color:#ffffff;text-align:left;">Estado Global</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}
