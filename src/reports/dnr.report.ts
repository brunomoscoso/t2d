import type { PositionReport } from '../types/report.types';
import { JIRA_URL } from '../config/jira.config';
import { escapeHtml } from '../utils/html.utils';

const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
const keyOf = (value: string) => clean(value).toLowerCase();

export function collectCertifications(positions: PositionReport[]) {
  const groups = new Map<
    string,
    { key: string; title: string; defects: string[]; aliases: string[] }
  >();
  for (const position of positions) {
    for (const report of position.reports) {
      const countryGroup = report.testType === 'portugal' || report.testType === 'espanha';
      if (
        report.testType !== 'certification' &&
        !(countryGroup && /\bcertification\b/i.test(report.title))
      )
        continue;
      let title = clean(report.title);
      // Remove apenas prefixos que identificam a posição, preservando tags de funcionalidades.
      const prefix = title.match(/^(?:\s*\[[^\]]+\])+/)?.[0];
      if (prefix) {
        const tags = [...prefix.matchAll(/\[([^\]]+)\]/g)].map((match) => match[1]);
        let consumed = '';
        for (let index = 0; index < tags.length; index++) {
          consumed += (index ? ' ' : '') + tags[index];
          if (keyOf(consumed) === keyOf(position.position)) {
            title = title
              .replace(new RegExp('^(?:\\s*\\[[^\\]]+\\]){' + (index + 1) + '}'), '')
              .trim();
            break;
          }
        }
      }
      title =
        title
          .replace(/^[-–—:]\s*/, '')
          .replace(/^certification\b\s*[-–—:]?\s*/i, '')
          .trim() || clean(report.title);
      const legacyKey = keyOf(title);
      // As tags anteriores a Certification são contexto da execução (posto/mercado).
      // O nome funcional começa depois desse marcador; preserva todas as suas palavras/tags.
      title =
        title.replace(/^(?:\s*\[[^\]]+\])+\s*[-–—:]?\s*certification\b\s*[-–—:]?\s*/i, '').trim() ||
        title;
      const key = keyOf(title);
      if (!groups.has(key)) groups.set(key, { key, title, defects: [], aliases: [] });
      const group = groups.get(key)!;
      if (!group.aliases.includes(legacyKey)) group.aliases.push(legacyKey);
      for (const issue of report.issueLinks) {
        const prit = issue.prit.trim().toUpperCase();
        if (/^PRIT-\d+$/.test(prit) && !group.defects.includes(prit)) group.defects.push(prit);
      }
    }
  }
  return [...groups.values()];
}

export function createDnrSection(positions: PositionReport[]): string {
  const groups = collectCertifications(positions);
  if (!groups.length) return '';
  const cell =
    'padding:6px 8px;border:1px solid #dce5f0;text-align:left;vertical-align:top;overflow-wrap:anywhere;';
  return `<section id="dnr-section" aria-labelledby="dnr-title" style="margin:0 0 20px;">
    <h2 id="dnr-title" style="margin:0 0 10px;font-size:14px;color:#142e57;">DNRs — Documentação de Certificação<button type="button" data-remove-dnr-section data-editor-only aria-label="Remover seção DNRs" style="float:right;">×</button></h2>
    <table id="dnr-table" class="report-summary-table" width="100%" cellpadding="0" cellspacing="0" data-certifications="${escapeHtml(JSON.stringify(groups))}" data-jira-url="${escapeHtml(JIRA_URL.replace(/\/$/, ''))}" style="width:100%;table-layout:fixed;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#172b4d;">
    <thead><tr>${['Número da DNR', 'Link da DNR', 'Tipo de Certificação', 'Defects Associados'].map((label) => `<th scope="col" style="${cell}background:#244779;color:#ffffff;">${label}</th>`).join('')}</tr></thead>
    <tbody><tr data-dnr-row>
    <td style="${cell}"><input data-dnr-field="number" aria-label="Número da DNR"><button type="button" data-remove-dnr data-editor-only aria-label="Remover DNR">×</button></td>
    <td style="${cell}"><input data-dnr-field="url" aria-label="Link da DNR"></td>
    <td style="${cell}"><select data-dnr-field="certification" aria-label="Tipo de Certificação"><option value=""></option>${groups.map((group) => `<option value="${escapeHtml(group.key)}">${escapeHtml(group.title)}</option>`).join('')}</select></td>
    <td data-dnr-defects style="${cell}"></td></tr></tbody></table>
    <button type="button" data-add-dnr data-editor-only style="margin-top:10px;">Adicionar DNR</button>
  </section>`;
}

export const dnrStyles = `
  [data-dnr-field] { width:100%;min-width:0;max-width:100%;box-sizing:border-box;padding:6px;border:1px solid #cbd9ec;border-radius:6px;background:white;color:#172b4d;font:inherit; }
  #dnr-section button { padding:3px 7px;border:1px solid #b8c9e2;border-radius:5px;background:white;color:#0052cc;font:inherit;cursor:pointer; }
  #dnr-section [data-remove-dnr-section] { color:#ae2e24;font-size:14px;line-height:1; }
`;

export const dnrScript = `
  function initializeDnrs() {
    const section = document.getElementById('dnr-section');
    if (!section) return;
    const table = section.querySelector('table');
    const groups = JSON.parse(table.dataset.certifications);
    const body = table.tBodies[0];
    const template = body.rows[0].cloneNode(true);
    const storageKey = 't2d:dnrs:v1:' + location.pathname;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(storageKey)); } catch (_) {}
    if (saved && saved.version === 1 && saved.removed === true) { section.remove(); return; }
    function save(removed = false) {
      const rows = Array.from(body.rows).map(row => Object.fromEntries(
        Array.from(row.querySelectorAll('[data-dnr-field]')).map(field => [field.dataset.dnrField, field.value])
      ));
      try { localStorage.setItem(storageKey, JSON.stringify({version:1, removed, rows})); } catch (_) {}
    }
    function addRow(values = {}) {
      const row = template.cloneNode(true);
      body.appendChild(row);
      const select = row.querySelector('select');
      function updateDefects() {
        const cell = row.querySelector('[data-dnr-defects]');
        cell.replaceChildren();
        const group = groups.find(group => group.key === select.value);
        (group ? group.defects : []).forEach((prit, index) => {
          if (index) cell.appendChild(document.createTextNode(', '));
          const link = document.createElement('a');
          link.href = table.dataset.jiraUrl + '/browse/' + encodeURIComponent(prit);
          link.textContent = prit;
          link.style.cssText = 'color:#0052cc;text-decoration:underline;';
          cell.appendChild(link);
        });
      }
      row.querySelectorAll('[data-dnr-field]').forEach(field => {
        if (values && typeof values[field.dataset.dnrField] === 'string') {
          const value = values[field.dataset.dnrField];
          const group = field === select ? groups.find(group => group.key === value || group.aliases.includes(value)) : null;
          field.value = group ? group.key : value;
        }
        field.addEventListener('input', () => { updateDefects(); save(); });
        field.addEventListener('change', () => { updateDefects(); save(); });
      });
      row.querySelector('[data-remove-dnr]').addEventListener('click', () => { row.remove(); save(); });
      updateDefects();
      return row;
    }
    body.replaceChildren();
    (saved && saved.version === 1 && Array.isArray(saved.rows) ? saved.rows : [{}]).forEach(addRow);
    section.querySelector('[data-add-dnr]').addEventListener('click', () => { addRow().querySelector('input').focus(); save(); });
    section.querySelector('[data-remove-dnr-section]').addEventListener('click', () => { save(true); section.remove(); });
  }
  initializeDnrs();

  function prepareDnrsForCopy(report, restoreActions) {
    report.querySelectorAll('[data-dnr-field]').forEach(field => {
      const value = field.tagName === 'SELECT' ? (field.selectedOptions[0]?.textContent || '') : field.value;
      const isLink = field.dataset.dnrField === 'url' && /^https?:\\/\\//i.test(value.trim());
      const text = document.createElement(isLink ? 'a' : 'span');
      text.textContent = value;
      if (isLink) { text.href = value.trim(); text.style.color = '#0052cc'; }
      restoreActions.push(() => text.replaceWith(field));
      field.replaceWith(text);
    });
  }
`;
