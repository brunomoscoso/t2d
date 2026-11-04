// Uma seleção de postos controla todos os conteúdos associados a posições.
export const globalStatusStyles = `
    #position-picker-section { position: relative; }
    [data-report-position][hidden],
    [data-report-positions][hidden],
    [data-position-section][hidden] { display: none !important; }
    .global-position-picker {
        min-width: 0;
        margin: 0 0 18px;
        padding: 18px 16px;
        border: 1px solid #cbd9ec;
        border-radius: 14px;
        background: #ffffff;
        box-shadow: 0 6px 20px #172b4d08;
    }
    .global-position-picker legend { padding: 0 6px; font-weight: bold; color: #0747a6; }
    .global-position-picker p { margin: 0 0 12px; color: #5e6c84; font-size: 11px; line-height: 1.5; }
    .global-position-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 5px 12px;
    }
    .global-position-choice {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        border-radius: 7px;
        font-size: 11px;
        cursor: pointer;
        overflow-wrap: anywhere;
    }
    .global-position-choice:hover,
    .global-position-choice:has(input:checked) { background: #eaf2ff; color: #0747a6; }
    .global-position-choice input { margin: 0; width: 16px; height: 16px; flex-shrink: 0; accent-color: #0052cc; }
    .global-position-actions {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 14px;
        font-size: 11px;
    }
    .global-position-actions button {
        padding: 8px 10px;
        border: 1px solid #b8c9e2;
        border-radius: 7px;
        background: #ffffff;
        color: #0052cc;
        font: inherit;
        cursor: pointer;
    }
    .global-position-actions button:hover { background: #eaf2ff; }
    #global-position-count {
        display: block;
        width: 100%;
        padding-top: 12px;
        border-top: 1px solid #e1e9f4;
        color: #0747a6;
        font-size: 11px;
        font-weight: bold;
    }
    .global-status-fields {
        display: grid;
        grid-template-columns: 16px minmax(0, 240px) minmax(0, 1fr);
        align-items: center;
        gap: 8px;
    }
    .global-status-fields:has([data-status-dot][hidden]) {
        grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
    }
    .global-status-fields select,
    .global-status-fields input,
    .installation-status-fields select,
    .installation-status-fields input {
        width: 100%;
        max-width: 100%;
        min-width: 0;
        padding: 9px;
        border: 1px solid #b8c9e2;
        border-radius: 7px;
        background: #ffffff;
        color: #172b4d;
        font: inherit;
    }
    .global-status-fields select,
    .installation-status-fields select { font-weight: bold; cursor: pointer; }
    .installation-status-fields {
        display: grid;
        grid-template-columns: 12px 68px minmax(0, 1fr);
        align-items: center;
        gap: 6px;
    }
    .installation-status-fields select { padding-inline: 6px; }
    .installation-status-fields input:focus-visible { outline: 2px solid #0052cc; outline-offset: 1px; }
    #global-status-table { table-layout: fixed; }
    #global-status-section [hidden] { display: none !important; }
    .global-position-picker :focus-visible { outline: 2px solid #0052cc; outline-offset: 3px; }
    @media (max-width: 700px) {
        .global-position-options { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        #global-status-table thead th:first-child { width: 20% !important; }
        #global-status-table th,
        #global-status-table td { padding: 8px 6px !important; }
        .global-status-fields { grid-template-columns: 16px minmax(0, 1fr); }
        .global-status-fields:has([data-status-dot][hidden]) { grid-template-columns: minmax(0, 1fr); }
        .global-status-fields input { grid-column: 1 / -1; }
        .installation-status-fields { grid-template-columns: 12px minmax(0, 68px); }
        .installation-status-fields input { grid-column: 1 / -1; }
    }
    @media print {
        [data-editor-only] { display: none !important; }
    }
`;

export const globalStatusScript = `
    function initializeGlobalStatuses() {
        const table = document.getElementById('global-status-table');
        if (!table) return;

        const picker = document.getElementById('position-picker-section');
        const rows = Array.from(table.querySelectorAll('[data-global-status-row]'));
        const toggles = new Map(Array.from(picker.querySelectorAll('[data-position-toggle]'))
            .map(toggle => [toggle.value, toggle]));
        const storageKey = 't2d:global-status:v2:' + window.location.pathname;
        const legacyStoragePrefix = 't2d:global-status:v1:' + window.location.pathname + ':';
        let savedRows = [];

        try {
            const saved = localStorage.getItem(storageKey);
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) savedRows = parsed;
            } else {
                const legacyKeys = [];
                for (let index = 0; index < localStorage.length; index++) {
                    const key = localStorage.key(index);
                    if (key && key.startsWith(legacyStoragePrefix)) legacyKeys.push(key);
                }
                const currentLegacyKey = legacyStoragePrefix + table.dataset.reportKey;
                const orderedLegacyKeys = legacyKeys
                    .filter(key => key !== currentLegacyKey)
                    .concat(legacyKeys.includes(currentLegacyKey) ? [currentLegacyKey] : []);
                const rowsByPosition = new Map();
                orderedLegacyKeys.forEach(key => {
                    try {
                        const legacy = JSON.parse(localStorage.getItem(key) || '[]');
                        if (Array.isArray(legacy)) {
                            legacy.forEach(row => {
                                if (row && typeof row.position === 'string') {
                                    rowsByPosition.set(row.position, {
                                        ...rowsByPosition.get(row.position),
                                        ...row,
                                    });
                                }
                            });
                        }
                    } catch (error) {
                        // Ignora entradas antigas inválidas e tenta as restantes.
                    }
                });
                savedRows = Array.from(rowsByPosition.values());
            }
        } catch (error) {
            // A edição continua disponível quando o armazenamento está bloqueado.
        }

        function save() {
            try {
                const rowsByPosition = new Map(savedRows
                    .filter(row => row && typeof row.position === 'string')
                    .map(row => [row.position, row]));
                rows.forEach(row => rowsByPosition.set(row.dataset.position, {
                    position: row.dataset.position,
                    selected: toggles.get(row.dataset.position).checked,
                    selectionVersion: 3,
                    selectionKey: picker.dataset.selectionKey,
                    status: row.querySelector('[data-status-select]').value,
                    installation: row.querySelector('[data-installation-select]').value,
                    installationVersion: row.querySelector('[data-installation-version]').value,
                    note: row.querySelector('[data-status-note]').value,
                }));
                savedRows = Array.from(rowsByPosition.values());
                localStorage.setItem(storageKey, JSON.stringify(savedRows));
            } catch (error) {
                // Não impede a edição nem a cópia em navegadores sem armazenamento.
            }
        }

        function updateSelection() {
            const selected = new Set(Array.from(toggles.values())
                .filter(toggle => toggle.checked).map(toggle => toggle.value));
            document.querySelectorAll('[data-report-position]').forEach(element => {
                element.hidden = !selected.has(element.dataset.reportPosition);
            });
            document.querySelectorAll('[data-report-positions]').forEach(element => {
                const names = JSON.parse(element.dataset.reportPositions)
                    .filter(position => selected.has(position));
                element.hidden = names.length === 0;
                const label = element.querySelector('[data-defect-positions]');
                if (label) label.textContent = names.join(', ');
            });
            // Oculta também o título e os cabeçalhos quando não há conteúdo selecionado.
            document.querySelectorAll('[data-position-section]').forEach(section => {
                const visible = section.querySelector(
                    '[data-report-position]:not([hidden]), [data-report-positions]:not([hidden]), [data-position-independent]'
                );
                section.hidden = !visible;
            });
            const count = selected.size;
            document.getElementById('global-position-count').textContent = count === 1
                ? '1 posto selecionado'
                : count + ' postos selecionados';
        }

        rows.forEach(row => {
            const toggle = toggles.get(row.dataset.position);
            const select = row.querySelector('[data-status-select]');
            const note = row.querySelector('[data-status-note]');
            const dot = row.querySelector('[data-status-dot]');
            const installation = row.querySelector('[data-installation-select]');
            const installationVersion = row.querySelector('[data-installation-version]');
            const installationDot = row.querySelector('[data-installation-dot]');
            const saved = savedRows.find(item => item && item.position === row.dataset.position);

            if (saved) {
                // Restaura escolhas apenas para a mesma configuração de Test Plans.
                // Notas e estados continuam disponíveis quando a configuração muda.
                if (saved.selectionVersion === 3 && saved.selectionKey === picker.dataset.selectionKey
                    && typeof saved.selected === 'boolean') {
                    toggle.checked = saved.selected;
                }
                if (Array.from(select.options).some(option => option.value === saved.status)) {
                    select.value = saved.status;
                }
                if (typeof saved.note === 'string') note.value = saved.note.slice(0, note.maxLength);
                if (typeof saved.installationVersion === 'string') {
                    installationVersion.value = saved.installationVersion.slice(0, installationVersion.maxLength);
                }
                if (Array.from(installation.options).some(option => option.value === saved.installation)) {
                    installation.value = saved.installation;
                }
            }

            function updateDot() {
                dot.hidden = select.value === 'completed';
                dot.style.color = select.selectedOptions[0].dataset.color;
            }
            function updateInstallation() {
                const color = installation.selectedOptions[0].dataset.color;
                installation.style.color = color;
                installationDot.style.color = color;
            }

            updateDot();
            updateInstallation();
            installation.addEventListener('change', () => {
                updateInstallation();
                save();
            });
            toggle.addEventListener('change', () => {
                updateSelection();
                save();
            });
            select.addEventListener('change', () => {
                updateDot();
                save();
            });
            note.addEventListener('input', save);
            installationVersion.addEventListener('input', save);
        });

        function selectAll(selected) {
            toggles.forEach(toggle => { toggle.checked = selected; });
            updateSelection();
            save();
        }

        picker.querySelector('[data-select-all-positions]').addEventListener('click', () => selectAll(true));
        picker.querySelector('[data-clear-positions]').addEventListener('click', () => selectAll(false));
        updateSelection();
    }
    initializeGlobalStatuses();
`;
