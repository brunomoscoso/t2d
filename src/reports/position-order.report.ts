import type { PositionReport } from '../types/report.types';

const preferredOrder = [
  'coco pt',
  'tangerina',
  'coco sp',
  'reseller',
  'marinas',
  'arco do cego',
  'olivais',
  'las rozas',
  'badajoz',
];

function positionRank(name: string): number {
  const key = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/^resseller$/, 'reseller')
    .replace(/^las rosas$/, 'las rozas');
  if (key === 'automacao') return Number.MAX_SAFE_INTEGER;
  const index = preferredOrder.indexOf(key);
  return index < 0 ? preferredOrder.length : index;
}

export function sortReportPositions(positions: PositionReport[]): PositionReport[] {
  return [...positions].sort((a, b) => comparePositionNames(a.position, b.position));
}

export function comparePositionNames(a: string, b: string): number {
  return positionRank(a) - positionRank(b);
}

export const positionOrderScript = `
  function initializePositionOrder() {
    const blocks = Array.from(document.querySelectorAll('.position-block[data-report-position]'));
    if (!blocks.length) return;
    const parent = blocks[0].parentNode;
    const storageKey = 't2d:position-order:v1:' + location.pathname;
    const isAutomation = block => block.dataset.reportPosition.normalize('NFD')
      .replace(/[\\u0300-\\u036f]/g, '').trim().toLowerCase() === 'automacao';
    const current = () => Array.from(parent.children).filter(node => blocks.includes(node));
    function applyOrder(ordered) {
      const marker = document.createComment('position order');
      parent.insertBefore(marker, current()[0]);
      ordered.filter(block => !isAutomation(block)).concat(ordered.filter(isAutomation))
        .forEach(block => parent.insertBefore(block, marker));
      marker.remove();
    }
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey));
      if (Array.isArray(saved) && saved.every(name => typeof name === 'string')) {
        const rank = name => saved.includes(name) ? saved.indexOf(name) : saved.length;
        applyOrder([...blocks].sort((a, b) => rank(a.dataset.reportPosition) - rank(b.dataset.reportPosition)));
      }
    } catch (_) {}
    function save() {
      try { localStorage.setItem(storageKey, JSON.stringify(current().map(block => block.dataset.reportPosition))); } catch (_) {}
    }
    function refresh() {
      const visible = current().filter(block => !block.hidden && !isAutomation(block));
      blocks.forEach(block => {
        const index = visible.indexOf(block);
        block.querySelector('[data-position-up]').disabled = index <= 0;
        block.querySelector('[data-position-down]').disabled = index < 0 || index === visible.length - 1;
      });
    }
    let dragged = null;
    let dropTarget = null;
    function clearDropTarget() {
      if (dropTarget) { dropTarget.style.outline = ''; dropTarget.style.outlineOffset = ''; }
      dropTarget = null;
    }
    blocks.forEach(block => {
      const controls = document.createElement('div');
      controls.dataset.editorOnly = '';
      controls.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;align-items:center;';
      const caption = document.createElement('span');
      caption.textContent = isAutomation(block) ? 'Automação permanece no final' : 'Mover posição:';
      controls.appendChild(caption);
      if (!isAutomation(block)) {
        const handle = document.createElement('span');
        handle.setAttribute('role', 'button');
        handle.tabIndex = 0;
        handle.draggable = true;
        handle.dataset.positionDrag = '';
        handle.textContent = '⠿ Arrastar posição';
        handle.setAttribute('aria-label', 'Arrastar ' + block.dataset.reportPosition);
        handle.title = 'Arraste para outra posição ou use as setas do teclado';
        handle.style.cssText = 'cursor:grab;padding:4px 8px;border:1px solid #b8c9e2;border-radius:5px;background:white;color:#0052cc;font:inherit;';
        handle.addEventListener('dragstart', event => {
          dragged = block;
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', block.dataset.reportPosition);
        });
        handle.addEventListener('dragend', () => { dragged = null; clearDropTarget(); });
        handle.addEventListener('keydown', event => {
          if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
          event.preventDefault();
          block.querySelector(event.key === 'ArrowUp' ? '[data-position-up]' : '[data-position-down]').click();
          handle.focus();
        });
        controls.appendChild(handle);
      }
      block.addEventListener('dragover', event => {
        if (!dragged || dragged === block || block.hidden) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        clearDropTarget();
        dropTarget = block;
        block.style.outline = '2px dashed #0052cc';
        block.style.outlineOffset = '3px';
      });
      block.addEventListener('dragleave', event => {
        if (!block.contains(event.relatedTarget)) clearDropTarget();
      });
      block.addEventListener('drop', event => {
        if (!dragged || dragged === block || block.hidden) return;
        event.preventDefault();
        const rect = block.getBoundingClientRect();
        if (isAutomation(block) || event.clientY < rect.top + rect.height / 2) block.before(dragged);
        else block.after(dragged);
        const handle = dragged.querySelector('[data-position-drag]');
        dragged = null;
        clearDropTarget(); save(); refresh(); handle.focus();
      });
      ['up', 'down'].forEach(direction => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-position-' + direction, '');
        button.textContent = direction === 'up' ? '↑ Subir' : '↓ Descer';
        button.setAttribute('aria-label', (direction === 'up' ? 'Subir ' : 'Descer ') + block.dataset.reportPosition);
        button.style.cssText = 'padding:4px 8px;border:1px solid #b8c9e2;border-radius:5px;background:white;color:#0052cc;font:inherit;cursor:pointer;';
        button.addEventListener('click', () => {
          const visible = current().filter(item => !item.hidden && !isAutomation(item));
          const index = visible.indexOf(block);
          if (index < 0) return;
          const neighbor = visible[index + (direction === 'up' ? -1 : 1)];
          if (!neighbor) return;
          if (direction === 'up') neighbor.before(block); else neighbor.after(block);
          save(); refresh(); button.focus();
        });
        controls.appendChild(button);
      });
      block.firstElementChild.after(controls);
    });
    const toolbar = document.createElement('div');
    toolbar.dataset.editorOnly = '';
    toolbar.style.cssText = 'margin:0 0 12px;';
    const reset = document.createElement('button');
    reset.type = 'button';
    reset.textContent = 'Restaurar ordem das posições';
    reset.addEventListener('click', () => { applyOrder(blocks); save(); refresh(); });
    toolbar.appendChild(reset);
    parent.insertBefore(toolbar, current()[0]);
    refresh();
    const observer = new MutationObserver(refresh);
    blocks.forEach(block => observer.observe(block, { attributes:true, attributeFilter:['hidden'] }));
  }
  initializePositionOrder();
`;
