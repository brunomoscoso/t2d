import { JIRA_URL } from '../config/jira.config';
import { escapeHtml, getStatusColors } from '../utils/html.utils';
import {
  overallPercentage,
  type Market,
  type OverallResults,
} from '../utils/overall-results.utils';

export const overallResultsStyles = `
  .overall-plan-picker { min-width:0; margin:0 0 18px; padding:16px; border:1px solid #cbd9ec; border-radius:14px; background:#fff; }
  .overall-plan-picker legend { padding:0 6px; font-weight:bold; color:#0747a6; }
  .overall-plan-picker p { margin:0 0 12px; color:#5e6c84; font-size:11px; line-height:1.5; }
  .overall-plan-picker .global-position-options { display:grid; grid-template-columns:repeat(auto-fit,minmax(180px,1fr)); gap:5px 12px; }
  .overall-plan-picker .global-position-choice { display:flex; align-items:center; gap:8px; padding:8px; border-radius:7px; font-size:11px; cursor:pointer; overflow-wrap:anywhere; }
  .overall-plan-picker .global-position-choice:hover,
  .overall-plan-picker .global-position-choice:has(input:checked) { background:#eaf2ff; color:#0747a6; }
  .overall-plan-picker input { margin:0; width:16px; height:16px; flex-shrink:0; accent-color:#0052cc; }
  .overall-plan-picker .global-position-actions { display:flex; align-items:center; flex-wrap:wrap; gap:10px; margin-top:14px; font-size:11px; }
  .overall-plan-picker button { padding:8px 10px; border:1px solid #b8c9e2; border-radius:7px; background:#fff; color:#0052cc; font:inherit; cursor:pointer; }
  .overall-plan-picker button:hover { background:#eaf2ff; }
  .overall-plan-picker :focus-visible { outline:2px solid #0052cc; outline-offset:3px; }
  #overall-plan-count { color:#0747a6; font-size:11px; font-weight:bold; }
  .overall-results-table { min-width:760px; }
  #overall-results-section [hidden] { display:none !important; }
  @media print {
    #overall-results-section [data-editor-only],
    #overall-results-section[data-empty="true"] { display:none !important; }
    .overall-results-table { min-width:0; }
    #overall-results-section [data-report-scroll] { overflow:visible; }
  }
`;

// Partilhado pelas duas páginas HTML. A seleção segue o mecanismo dos postos.
export const overallResultsScript = `
  function initializeOverallResults() {
    const section = document.getElementById('overall-results-section');
    if (!section) return;
    const toggles = Array.from(section.querySelectorAll('[data-test-plan-toggle]'));
    const plans = Array.from(section.querySelectorAll('[data-overall-plan]'));
    const storageKey = 't2d:overall-results:v1:' + window.location.pathname + ':' + section.dataset.reportKey;
    let saved = [];
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '[]');
      if (Array.isArray(value)) saved = value.filter(key => typeof key === 'string');
    } catch (error) { /* A seleção continua disponível sem armazenamento. */ }
    toggles.forEach(toggle => { toggle.checked = saved.includes(toggle.value); });
    function updateSelection() {
      const selected = new Set(toggles.filter(toggle => toggle.checked).map(toggle => toggle.value));
      plans.forEach(plan => { plan.hidden = !selected.has(plan.dataset.overallPlan); });
      section.dataset.empty = String(selected.size === 0);
      section.querySelector('#overall-results-empty').hidden = selected.size !== 0;
      section.querySelector('#overall-plan-count').textContent = selected.size === 1
        ? '1 plano selecionado' : selected.size + ' planos selecionados';
    }
    function save() {
      updateSelection();
      try {
        localStorage.setItem(storageKey, JSON.stringify(toggles.filter(toggle => toggle.checked).map(toggle => toggle.value)));
      } catch (error) { /* Não bloqueia a edição nem a cópia. */ }
    }
    toggles.forEach(toggle => toggle.addEventListener('change', save));
    section.querySelector('[data-select-all-test-plans]').addEventListener('click', () => {
      toggles.forEach(toggle => { toggle.checked = true; });
      save();
    });
    section.querySelector('[data-clear-test-plans]').addEventListener('click', () => {
      toggles.forEach(toggle => { toggle.checked = false; });
      save();
    });
    updateSelection();
  }
  initializeOverallResults();
`;

function renderWarnings(warnings: string[]): string {
  return warnings.length
    ? `<ul style="margin:12px 0;padding-left:22px;color:#875e00;font-size:11px;line-height:1.5;">${warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`
    : '';
}

export function createOverallResultsSection(overall: OverallResults): string {
  const editorWarnings = [
    ...new Set([...overall.warnings, ...overall.plans.flatMap((plan) => plan.warnings)]),
  ];
  const cellStyle =
    'padding:12px 8px;border:1px solid #dce5f0;text-align:center;vertical-align:middle;overflow-wrap:anywhere;';
  const choices = overall.plans
    .map(
      (plan, index) => `<label class="global-position-choice">
    <input type="checkbox" data-test-plan-toggle value="${escapeHtml(plan.key)}" aria-controls="overall-plan-${index}" />
    <span>${escapeHtml(plan.label)} (${escapeHtml(plan.prit || 'PRIT não configurado')})</span>
  </label>`,
    )
    .join('');
  const tables = overall.plans
    .map((plan, index) => {
      const headers = plan.statuses
        .map((status) => {
          const colors = getStatusColors(status);
          return `<th scope="col" style="${cellStyle}background:${colors.background};color:${colors.color};">${escapeHtml(status)}</th>`;
        })
        .join('');
      const rows = (['PT', 'SP'] as Market[])
        .map((market) => {
          const result = plan.markets[market];
          const cells = [...plan.statuses, null]
            .map((status) => {
              const count = status === null ? result.total : (result.counts[status] ?? 0);
              return `<td ${status === null ? 'data-overall-total' : `data-overall-status="${escapeHtml(status)}"`} style="${cellStyle}background:${status === null ? '#edf3fc' : '#ffffff'};">
          <strong style="font-size:14px;line-height:1.4;color:#172b4d;">${plan.available ? count : '—'}</strong><br />
          <span style="font-size:11px;line-height:1.4;color:#5e6c84;">${plan.available ? overallPercentage(count, result.total) : '—'}</span>
        </td>`;
            })
            .join('');
          return `<tr data-overall-market="${market}">
        <th scope="row" style="${cellStyle}background:#edf3fc;color:#0747a6;">${market}${plan.available && !result.executions ? '<br /><span style="font-size:11px;font-weight:normal;">Sem execuções</span>' : ''}</th>${cells}
      </tr>`;
        })
        .join('');
      const reference = plan.prit
        ? `<a href="${escapeHtml(`${JIRA_URL.replace(/\/+$/, '')}/browse/${encodeURIComponent(plan.prit)}`)}" target="_blank" rel="noopener noreferrer" style="color:#0052cc;">${escapeHtml(plan.prit)}</a>`
        : 'PRIT não configurado';
      return `<div id="overall-plan-${index}" data-overall-plan="${escapeHtml(plan.key)}" hidden style="margin:0 0 24px;">
      <h3 id="overall-plan-title-${index}" style="margin:0 0 12px;font-size:14px;line-height:1.5;color:#142e57;">${escapeHtml(plan.title)} — ${reference}</h3>
      <div class="report-table-scroll" data-report-scroll tabindex="0" role="region" aria-label="${escapeHtml(plan.label)}; desloque para ver todas as colunas">
        <table class="report-summary-table overall-results-table" aria-labelledby="overall-plan-title-${index}" width="100%" cellpadding="0" cellspacing="0"
          style="width:100%;max-width:100%;table-layout:fixed;border-collapse:collapse;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;">
          <thead><tr><th scope="col" style="${cellStyle}background:#244779;color:#ffffff;">Mercado</th>${headers}<th scope="col" style="${cellStyle}background:#244779;color:#ffffff;">Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;
    })
    .join('');
  return `<section id="overall-results-section" data-report-key="${escapeHtml(overall.reportKey)}" data-empty="true" aria-labelledby="overall-results-title" style="margin:0 0 32px;font-family:Arial,Helvetica,sans-serif;">
    <h2 id="overall-results-title" style="margin:0 0 14px;font-size:14px;line-height:1.3;color:#142e57;">Overall Test Results</h2>
    <fieldset class="overall-plan-picker" data-editor-only>
      <legend>Selecione os Test Plans</legend>
      <p>Resultados das execuções coletadas, separados por PT e SP.</p>
      <div class="global-position-options">${choices}</div>
      <div class="global-position-actions">
        <button type="button" data-select-all-test-plans>Selecionar todos os planos</button>
        <button type="button" data-clear-test-plans>Limpar seleção de planos</button>
        <span id="overall-plan-count" role="status" aria-live="polite">0 planos selecionados</span>
      </div>
      ${editorWarnings.length ? `<details><summary style="margin-top:12px;cursor:pointer;">Execuções sem vínculo confirmado (${editorWarnings.length})</summary>${renderWarnings(editorWarnings)}</details>` : ''}
    </fieldset>
    <p id="overall-results-empty" data-editor-only style="color:#5e6c84;">Os Test Plans selecionados aparecerão aqui.</p>
    ${tables}
  </section>`;
}
