import type { PositionReport } from '../types/report.types';
import { JIRA_URL } from '../config/jira.config';
import { escapeHtml, getPriorityMeta } from '../utils/html.utils';

const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
const keyOf = (value: string) => clean(value).toLowerCase();

export function collectCertifications(positions: PositionReport[]) {
  const groups = new Map<
    string,
    {
      key: string;
      title: string;
      defects: string[];
      priorities: Record<string, ReturnType<typeof getPriorityMeta>>;
      aliases: string[];
    }
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
      if (!groups.has(key))
        groups.set(key, { key, title, defects: [], priorities: {}, aliases: [] });
      const group = groups.get(key)!;
      if (!group.aliases.includes(legacyKey)) group.aliases.push(legacyKey);
      for (const issue of report.issueLinks) {
        const prit = issue.prit.trim().toUpperCase();
        if (!/^PRIT-\d+$/.test(prit)) continue;
        if (!group.defects.includes(prit)) group.defects.push(prit);
        if (!group.priorities[prit] || group.priorities[prit].label === 'Unknown') {
          group.priorities[prit] = getPriorityMeta(issue.priority);
        }
      }
    }
  }
  const priorityOrder = ['Highest', 'High', 'Medium', 'Low', 'Lowest', 'Unknown'];
  for (const group of groups.values()) {
    group.defects.sort(
      (a, b) =>
        priorityOrder.indexOf(group.priorities[a].label) -
        priorityOrder.indexOf(group.priorities[b].label),
    );
  }
  return [...groups.values()];
}

export function createDnrSection(positions: PositionReport[]): string {
  const groups = collectCertifications(positions);
  if (!groups.length) return '';
  const cell =
    'padding:6px 8px;border:1px solid #dce5f0;text-align:left;vertical-align:top;overflow-wrap:anywhere;';
  return `<section id="dnr-section" aria-labelledby="dnr-title" style="margin:0 0 20px;">
    <h2 id="dnr-title" style="margin:0 0 10px;font-size:14px;color:#142e57;">UCs — Use cases<button type="button" data-remove-dnr-section data-editor-only aria-label="Remover seção UCs" style="float:right;">×</button></h2>
    <table id="dnr-table" class="report-summary-table" width="100%" cellpadding="0" cellspacing="0" data-certifications="${escapeHtml(JSON.stringify(groups))}" data-jira-url="${escapeHtml(JIRA_URL.replace(/\/$/, ''))}" style="width:100%;table-layout:fixed;border-collapse:collapse;background:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#172b4d;">
    <thead><tr>${['UC', 'Tipo de Certificação', 'Defects Associados'].map((label) => `<th scope="col" style="${cell}background:#244779;color:#ffffff;">${label}</th>`).join('')}</tr></thead>
    <tbody><tr data-dnr-row>
    <td style="${cell}"><div style="display:flex;align-items:center;justify-content:space-between;gap:6px;min-width:0;"><span data-uc-display></span><button type="button" data-remove-dnr data-editor-only aria-label="Remover UC" title="Remover UC">×</button></div>
    <details data-uc-editor data-editor-only style="margin-top:6px;"><summary style="cursor:pointer;color:#0052cc;">Editar UC e link</summary><label style="display:block;margin-top:6px;">Número do UC<input data-dnr-field="number" aria-label="Número do UC" placeholder="UC 5252"></label><label style="display:block;margin-top:6px;">Link do UC<input data-dnr-field="url" aria-label="Link do UC" placeholder="https://..."></label><button type="button" data-save-uc style="margin-top:6px;">Concluir</button></details></td>
    <td style="${cell}"><select data-dnr-field="certification" aria-label="Tipo de Certificação"><option value=""></option>${groups.map((group) => `<option value="${escapeHtml(group.key)}">${escapeHtml(group.title)}</option>`).join('')}</select></td>
    <td data-dnr-defects style="${cell}"></td></tr></tbody></table>
    <button type="button" data-add-dnr data-editor-only style="margin-top:10px;">Adicionar UC</button>
  </section>`;
}

export const dnrStyles = `
  [data-dnr-field] { width:100%;min-width:0;max-width:100%;box-sizing:border-box;padding:6px;border:1px solid #cbd9ec;border-radius:6px;background:white;color:#172b4d;font:inherit; }
  #dnr-section button { padding:3px 7px;border:1px solid #b8c9e2;border-radius:5px;background:white;color:#0052cc;font:inherit;cursor:pointer; }
  #dnr-section [data-remove-dnr] { flex:0 0 28px;width:28px;height:28px;padding:0;display:inline-flex;align-items:center;justify-content:center;color:#ae2e24;line-height:1; }
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
    const restoreContainer = document.createElement('div');
    restoreContainer.dataset.editorOnly = '';
    restoreContainer.hidden = true;
    restoreContainer.style.marginBottom = '16px';
    const restoreButton = document.createElement('button');
    restoreButton.type = 'button';
    restoreButton.textContent = 'Restaurar tabela de UCs';
    restoreContainer.appendChild(restoreButton);
    section.before(restoreContainer);
    function removeSection() {
      section.remove();
      restoreContainer.hidden = false;
    }
    restoreButton.addEventListener('click', () => {
      restoreContainer.after(section);
      restoreContainer.hidden = true;
      save();
    });
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
      function updateUc() {
        const number = row.querySelector('[data-dnr-field="number"]').value.trim();
        const url = row.querySelector('[data-dnr-field="url"]').value.trim();
        const valid = /^https?:\\/\\//i.test(url);
        const label = document.createElement(valid ? 'a' : 'span');
        label.textContent = number || (url ? 'Abrir UC' : 'UC');
        if (valid) {
          label.href = url;
          label.title = url;
          label.target = '_blank';
          label.rel = 'noopener noreferrer';
          label.style.cssText = 'display:inline-block;padding:2px 7px;border:1px solid #dce5f0;border-radius:4px;background:#f4f7fc;color:#0052cc;text-decoration:underline;';
        }
        row.querySelector('[data-uc-display]').replaceChildren(label);
      }
      function updateDefects() {
        const cell = row.querySelector('[data-dnr-defects]');
        cell.replaceChildren();
        const links = document.createElement('div');
        links.className = 'uc-defect-links';
        links.style.cssText = 'padding:2px 0;line-height:1.8;';
        cell.appendChild(links);
        const group = groups.find(group => group.key === select.value);
        (group ? group.defects : []).forEach(prit => {
          const item = document.createElement('span');
          item.style.cssText = 'display:inline-block;margin:0 6px 4px 0;padding:2px 7px;border:1px solid #dce5f0;border-radius:4px;background:#f4f7fc;';
          const link = document.createElement('a');
          link.href = table.dataset.jiraUrl + '/browse/' + encodeURIComponent(prit);
          link.textContent = prit;
          link.style.cssText = 'white-space:nowrap;color:#0052cc;text-decoration:underline;';
          const priority = group.priorities[prit];
          const badge = document.createElement('span');
          badge.dataset.dnrPriority = '';
          badge.textContent = ' · ' + (priority.label === 'Unknown' ? 'Não definida' : priority.label);
          badge.title = 'Grau de prioridade do defect';
          badge.style.cssText = 'display:inline-block;font-weight:bold;color:' + priority.color + ';';
          item.append(link, badge);
          links.appendChild(item);
        });
      }
      row.querySelectorAll('[data-dnr-field]').forEach(field => {
        if (values && typeof values[field.dataset.dnrField] === 'string') {
          const value = values[field.dataset.dnrField];
          const group = field === select ? groups.find(group => group.key === value || group.aliases.includes(value)) : null;
          field.value = group ? group.key : value;
        }
        field.addEventListener('input', () => { updateUc(); updateDefects(); save(); });
        field.addEventListener('change', () => { updateUc(); updateDefects(); save(); });
      });
      row.querySelector('[data-uc-editor]').open = !values.number && !values.url;
      row.querySelector('[data-save-uc]').addEventListener('click', () => {
        updateUc(); save(); row.querySelector('[data-uc-editor]').open = false;
      });
      row.querySelector('[data-remove-dnr]').addEventListener('click', () => { row.remove(); save(); });
      updateUc();
      updateDefects();
      return row;
    }
    body.replaceChildren();
    (saved && saved.version === 1 && Array.isArray(saved.rows) ? saved.rows : [{}]).forEach(addRow);
    section.querySelector('[data-add-dnr]').addEventListener('click', () => { addRow().querySelector('input').focus(); save(); });
    section.querySelector('[data-remove-dnr-section]').addEventListener('click', () => { save(true); removeSection(); });
    if (saved && saved.version === 1 && saved.removed === true) removeSection();
  }
  initializeDnrs();

  function prepareDnrsForCopy(report, restoreActions) {
    report.querySelectorAll('[data-dnr-field="certification"]').forEach(field => {
      const text = document.createElement('span');
      text.textContent = field.selectedOptions[0]?.textContent || '';
      restoreActions.push(() => text.replaceWith(field));
      field.replaceWith(text);
    });
  }
`;
