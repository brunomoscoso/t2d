// Fundos da paleta do relatório, aplicados também às células para a cópia no Outlook.
export const tableStripingScript = `
    function applyTableStriping(root = document) {
        root.querySelectorAll('table.report-summary-table, table.jira-issues-table, table.dashboard-table').forEach(table => {
            Array.from(table.tBodies).forEach(body => {
                let visibleIndex = 0;
                Array.from(body.rows).forEach(row => {
                    if (row.hidden) return;
                    const background = visibleIndex++ % 2 ? '#edf3fc' : '#ffffff';
                    row.style.backgroundColor = background;
                    Array.from(row.cells).forEach(cell => {
                        cell.style.backgroundColor = background;
                    });
                });
            });
        });
    }

    function initializeTableStriping() {
        applyTableStriping();
        // Mantém a alternância ao selecionar postos e adicionar/remover bloqueadores.
        new MutationObserver(() => applyTableStriping()).observe(document.body, {
            subtree: true,
            childList: true,
            attributes: true,
            attributeFilter: ['hidden'],
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeTableStriping, { once: true });
    } else {
        initializeTableStriping();
    }
`;
