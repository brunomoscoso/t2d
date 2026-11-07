import {
  TYPES,
  LABELS,
  STORAGE_KEY,
  newPosition,
  normalizePrit,
  actionsUrl,
  countSources,
  validateConfig,
} from './config.mjs';

const $ = (selector) => document.querySelector(selector);
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
let config = { dashboardPageId: '', positions: [] };
let repository = 'brunomoscoso/t2d';
let damagedStorage = false;
let storageConflict = false;
let originalStorage = '';
function notice(message = '') {
  $('#notice').textContent = message;
  $('#notice').hidden = !message;
}

try {
  originalStorage = localStorage.getItem(STORAGE_KEY) || '';
  if (originalStorage) {
    const stored = JSON.parse(originalStorage);
    // Rascunhos podem estar incompletos, mas precisam de uma estrutura utilizável.
    if (
      !stored.config ||
      !Array.isArray(stored.config.positions) ||
      typeof stored.config.dashboardPageId !== 'string' ||
      stored.config.positions.some(
        (p) =>
          !p ||
          typeof p.name !== 'string' ||
          (p.testPlans
            ? typeof p.testPlans.portugal !== 'string' || typeof p.testPlans.espanha !== 'string'
            : !p.executions ||
              TYPES.some(
                (type) =>
                  !Array.isArray(p.executions[type]) ||
                  p.executions[type].some((v) => typeof v !== 'string'),
              )),
      )
    )
      throw new Error('Rascunho inválido');
    config = stored.config;
    repository = typeof stored.repository === 'string' ? stored.repository : repository;
  }
} catch {
  damagedStorage = true;
  notice(
    'Não foi possível recuperar a configuração guardada. Exporte uma cópia para recuperação e importe um JSON válido. Os dados anteriores não serão substituídos automaticamente.',
  );
}

function links() {
  try {
    const url = actionsUrl(repository);
    document.querySelectorAll('[data-actions-link]').forEach((link) => (link.href = url));
  } catch {
    document
      .querySelectorAll('[data-actions-link]')
      .forEach((link) => link.removeAttribute('href'));
  }
}

function metrics() {
  $('#position-count').textContent = config.positions.length;
  $('#prit-count').textContent = countSources(config.positions);
}

function save() {
  metrics();
  links();
  if (damagedStorage || storageConflict) {
    $('#save-status').textContent = 'Alterações não guardadas';
    return;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ config, repository }));
    $('#save-status').textContent = 'Guardado neste navegador';
  } catch {
    $('#save-status').textContent = 'Alterações não guardadas';
    notice(
      'O navegador não permitiu guardar os dados. Exporte a configuração antes de fechar esta página.',
    );
  }
}

function group(position, index, type) {
  const chips = position.executions[type]
    .map(
      (prit, pritIndex, list) =>
        `<span class="chip"><span>${escape(prit)}</span><button data-action="prit-up" data-prit="${pritIndex}" aria-label="Mover ${escape(prit)} para antes" ${pritIndex === 0 ? 'disabled' : ''}>‹</button><button data-action="prit-down" data-prit="${pritIndex}" aria-label="Mover ${escape(prit)} para depois" ${pritIndex === list.length - 1 ? 'disabled' : ''}>›</button><button class="remove-prit" data-action="prit-delete" data-prit="${pritIndex}" aria-label="Excluir ${escape(prit)}">×</button></span>`,
    )
    .join('');
  return `<div class="execution-group" data-type="${type}"><div class="execution-label"><span class="type-dot"></span>${LABELS[type]}</div><div class="chips">${chips || '<span class="empty-prits">Sem PRITs</span>'}</div><div class="add-prit"><input aria-label="Adicionar PRITs de ${LABELS[type]} em ${escape(position.name)}" placeholder="PRIT-1234, PRIT-1235" data-add-prit="${type}" autocomplete="off" spellcheck="false"><button data-action="prit-add" aria-label="Adicionar PRITs de ${LABELS[type]} em ${escape(position.name)}">＋</button></div></div>`;
}

function renderPositions() {
  $('#positions').innerHTML = config.positions.length
    ? config.positions
        .map((position, index) => {
          const previous = config.positions[index - 1];
          const next = config.positions[index + 1];
          return `<article class="position-card" data-index="${index}"><div class="position-header"><span class="position-index">${String(index + 1).padStart(2, '0')}</span><label class="position-name"><span class="visually-hidden">Nome da posição ${index + 1}</span><input data-field="name" value="${escape(position.name)}" maxlength="100"></label><div class="position-actions"><button class="icon-button" data-action="up" aria-label="Mover ${escape(position.name)} para cima" ${!previous || !!previous.testPlans !== !!position.testPlans ? 'disabled' : ''}>↑</button><button class="icon-button" data-action="down" aria-label="Mover ${escape(position.name)} para baixo" ${!next || !!next.testPlans !== !!position.testPlans ? 'disabled' : ''}>↓</button><button class="icon-button delete" data-action="delete" aria-label="Excluir posição ${escape(position.name)}">Excluir</button></div></div><div class="position-body">${
            position.testPlans
              ? `<div class="field-grid"><label>Test Plan · Portugal<input data-country="portugal" value="${escape(position.testPlans.portugal)}" placeholder="PRIT-1234"></label><label>Test Plan · Espanha<input data-country="espanha" value="${escape(position.testPlans.espanha)}" placeholder="PRIT-1234"></label></div><p class="hint">Os planos por país são fontes de recolha e aparecem no fim do relatório.</p>`
              : `<label class="plan-field">Test Plan <span class="hint">· opcional</span><input data-field="testPlanPrit" value="${escape(position.testPlanPrit || '')}" placeholder="PRIT-1234" spellcheck="false"></label><div class="execution-grid">${TYPES.map((type) => group(position, index, type)).join('')}</div>`
          }</div></article>`;
        })
        .join('')
    : '<div class="empty-state">Adicione a primeira posição ou importe uma configuração existente.<p>As PRITs ficam guardadas para as próximas execuções.</p></div>';
  metrics();
}

function render() {
  $('#dashboard').value = config.dashboardPageId;
  $('#repository').value = repository;
  renderPositions();
  links();
}

$('#dashboard').addEventListener('input', (event) => {
  config.dashboardPageId = event.target.value.trim();
  save();
});
$('#repository').addEventListener('input', (event) => {
  repository = event.target.value.trim();
  save();
});
$('#positions').addEventListener('input', (event) => {
  const card = event.target.closest('[data-index]');
  if (!card) return;
  const position = config.positions[Number(card.dataset.index)];
  if (event.target.dataset.field) position[event.target.dataset.field] = event.target.value;
  else if (event.target.dataset.country)
    position.testPlans[event.target.dataset.country] = event.target.value;
  else return;
  save();
});

function addPrits(card, groupElement) {
  const input = groupElement.querySelector('input');
  const values = input.value
    .split(/[\s,;]+/)
    .filter(Boolean)
    .map(normalizePrit);
  if (!values.length) throw new Error('Indique uma ou mais PRITs para adicionar.');
  const position = config.positions[Number(card.dataset.index)];
  const list = position.executions[groupElement.dataset.type];
  const existing = new Set(
    config.positions.flatMap((p) =>
      p.testPlans
        ? Object.values(p.testPlans).filter(Boolean).map(normalizePrit)
        : Object.values(p.executions).flat().map(normalizePrit),
    ),
  );
  for (const prit of values) {
    if (existing.has(prit)) throw new Error(`${prit} já está configurada para recolha.`);
    existing.add(prit);
  }
  list.push(...values);
}

$('#positions').addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const card = button.closest('[data-index]');
  const index = Number(card.dataset.index);
  const action = button.dataset.action;
  const position = config.positions[index];
  try {
    if (action === 'delete') {
      if (!confirm(`Excluir a posição "${position.name}" e todas as suas PRITs?`)) return;
      config.positions.splice(index, 1);
    } else if (action === 'up' || action === 'down') {
      const other = index + (action === 'up' ? -1 : 1);
      [config.positions[index], config.positions[other]] = [config.positions[other], position];
    } else {
      const groupElement = button.closest('[data-type]');
      const list = position.executions[groupElement.dataset.type];
      const pritIndex = Number(button.dataset.prit);
      if (action === 'prit-add') addPrits(card, groupElement);
      else if (action === 'prit-delete') list.splice(pritIndex, 1);
      else {
        const other = pritIndex + (action === 'prit-up' ? -1 : 1);
        [list[pritIndex], list[other]] = [list[other], list[pritIndex]];
      }
    }
    notice();
    save();
    renderPositions();
  } catch (error) {
    notice(error.message);
  }
});

$('#positions').addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.matches('[data-add-prit]')) {
    event.preventDefault();
    event.target.closest('[data-type]').querySelector('[data-action="prit-add"]').click();
  }
});

function addPosition(country = false) {
  if (config.positions.length >= 100) return notice('O limite é de 100 posições.');
  let number = 1;
  const prefix = country ? 'Automações' : 'Posição';
  while (config.positions.some((p) => p.name === `${prefix} ${number}`)) number++;
  const position = country
    ? { name: `${prefix} ${number}`, testPlans: { portugal: '', espanha: '' } }
    : newPosition(`${prefix} ${number}`);
  config.positions.push(position);
  config.positions.sort((a, b) => Number(!!a.testPlans) - Number(!!b.testPlans));
  notice();
  save();
  renderPositions();
  const index = config.positions.indexOf(position);
  const input = $(`[data-index="${index}"] [data-field="name"]`);
  input.focus();
  input.select();
}
$('#add-position').addEventListener('click', () => addPosition());
$('#add-country').addEventListener('click', () => addPosition(true));

$('#export').addEventListener('click', () => {
  const contents =
    damagedStorage && originalStorage ? originalStorage : JSON.stringify(config, null, 2);
  const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = damagedStorage ? 't2d-recuperacao.json' : 't2d-configuracao.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#import').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 100000) throw new Error('O ficheiro excede 100 KB.');
    const imported = validateConfig(JSON.parse(await file.text()), false);
    if (
      (config.positions.length || originalStorage) &&
      !confirm(
        'Substituir a configuração atual pelo ficheiro importado? Exporte antes se pretende conservar uma cópia.',
      )
    )
      return;
    config = imported;
    damagedStorage = false;
    storageConflict = false;
    notice();
    save();
    render();
  } catch (error) {
    notice(`Não foi possível importar: ${error.message}`);
  } finally {
    event.target.value = '';
  }
});

$('#prepare').addEventListener('click', () => {
  try {
    actionsUrl(repository);
    const prepared = validateConfig(config);
    // Não apaga nem normaliza silenciosamente o rascunho persistente.
    $('#run-json').value = JSON.stringify(prepared);
    $('#copy-status').textContent = '';
    notice();
    $('#run-dialog').showModal();
  } catch (error) {
    notice(error.message);
    $('#notice').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
});
$('#close-dialog').addEventListener('click', () => $('#run-dialog').close());
$('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#run-json').value);
    $('#copy-status').textContent = 'Configuração copiada. Abra o GitHub Actions para iniciar.';
  } catch {
    $('#run-json').focus();
    $('#run-json').select();
    $('#copy-status').textContent =
      'Cópia automática indisponível. Copie o texto selecionado com Ctrl+C ou ⌘C.';
  }
});

// Evita substituir alterações de outra aba com um rascunho antigo.
window.addEventListener('storage', (event) => {
  if (event.key !== STORAGE_KEY) return;
  storageConflict = true;
  notice(
    'A configuração foi alterada noutra aba. Recarregue esta página antes de continuar. Pode exportar as alterações desta aba.',
  );
  $('#save-status').textContent = 'Recarregue para sincronizar';
});
render();
if (damagedStorage) $('#save-status').textContent = 'Armazenamento indisponível';
