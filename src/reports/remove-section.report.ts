import { escapeHtml } from '../utils/html.utils';

export function createRemoveSectionButton(label: string): string {
  return `<button type="button" data-editor-only data-remove-report-section
    aria-label="${escapeHtml(`Excluir ${label} do relatório`)}"
    title="Excluir do relatório. Reabra a página para restaurar."
    onclick="this.closest('[data-removable-section]').remove()"
    style="float:right;margin-left:8px;padding:2px 6px;border:1px solid #c1c7d0;border-radius:4px;background:#ffffff;color:#44546f;font:11px Arial,Helvetica,sans-serif;cursor:pointer;">× Excluir</button>`;
}
