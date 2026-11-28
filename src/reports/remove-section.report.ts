import { escapeHtml } from '../utils/html.utils';

export function createRemoveSectionButton(label: string): string {
  return `<button type="button" data-editor-only data-remove-report-section
    aria-label="${escapeHtml(`Excluir ${label} do relatório`)}"
    title="Excluir do relatório. Reabra a página para restaurar."
    onclick="const section = this.closest('[data-removable-section]');
      if (section.hasAttribute('data-dashboard-id')) {
        document.querySelectorAll('[data-dashboard-link-id]').forEach(row => {
          if (row.dataset.dashboardLinkId === section.dataset.dashboardId) row.remove();
        });
        const links = document.getElementById('release-links-section');
        if (links) links.hidden = !links.querySelector('tbody tr:not([hidden])');
      }
      section.remove();"
    style="float:right;margin-left:8px;padding:2px 6px;border:1px solid #c1c7d0;border-radius:4px;background:#ffffff;color:#44546f;font:11px Arial,Helvetica,sans-serif;cursor:pointer;">× Excluir</button>`;
}
