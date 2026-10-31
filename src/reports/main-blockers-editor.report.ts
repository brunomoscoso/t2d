export const mainBlockersStyles = `
    [data-blocker-field] {
        display: block;
        width: 100%;
        max-width: 100%;
        min-width: 0;
        min-height: 84px;
        padding: 10px;
        border: 1px solid #cbd9ec;
        border-radius: 8px;
        background: #ffffff;
        color: #172b4d;
        font: inherit;
        line-height: 1.5;
        resize: vertical;
    }
    .blocker-actions { margin-top:12px; }
    [data-add-blocker],
    [data-remove-blocker] {
        padding:8px 12px;
        border:1px solid #b8c9e2;
        border-radius:7px;
        background:#ffffff;
        color:#0052cc;
        font:inherit;
        cursor:pointer;
    }
    [data-add-blocker]:hover { background:#eaf2ff; }
    [data-remove-blocker] { margin-top:8px; color:#ae2e24; border-color:#f1b5af; }
    [data-remove-blocker]:hover:not(:disabled) { background:#ffedeb; }
    [data-remove-blocker]:disabled { opacity:0.45; cursor:default; }
    [data-blocker-field]::placeholder { color: #5e6c84; }
    [data-blocker-field]:focus-visible { outline: 2px solid #0052cc; outline-offset: 3px; }
`;

export const mainBlockersScript = `
    function initializeBlockers() {
        const table = document.getElementById('main-blockers-table');
        if (!table) return;
        const body = table.tBodies[0];
        const rowTemplate = body.rows[0].cloneNode(true);
        const rows = () => Array.from(body.querySelectorAll('[data-blocker-row]'));
        const fields = () => Array.from(body.querySelectorAll('[data-blocker-field]'));
        const storageKey = 't2d:main-blockers:v2:' + window.location.pathname;
        const legacyStoragePrefix = 't2d:main-blockers:v1:' + window.location.pathname + ':';
        let savedRows = [];
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved !== null) {
                const parsed = JSON.parse(saved);
                if (parsed && parsed.version === 2 && Array.isArray(parsed.rows)) {
                    savedRows = parsed.rows;
                }
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
                orderedLegacyKeys.forEach(key => {
                    try {
                        const legacy = JSON.parse(localStorage.getItem(key) || 'null');
                        if (Array.isArray(legacy)) {
                            // O formato antigo tinha cinco linhas fixas; migra apenas as preenchidas.
                            savedRows = legacy.filter(row => row && (
                                (typeof row.theme === 'string' && row.theme.trim())
                                || (typeof row.impact === 'string' && row.impact.trim())
                            ));
                        } else if (legacy && legacy.version === 2 && Array.isArray(legacy.rows)) {
                            savedRows = legacy.rows;
                        }
                    } catch (error) {
                        // Ignora entradas antigas inválidas e tenta as restantes.
                    }
                });
            }
        } catch (error) {
            // A edição continua disponível sem armazenamento.
        }
        function save() {
            try {
                localStorage.setItem(storageKey, JSON.stringify({
                    version: 2,
                    rows: rows().map(row => ({
                        theme: row.querySelector('[data-blocker-field="theme"]').value,
                        impact: row.querySelector('[data-blocker-field="impact"]').value,
                    })),
                }));
            } catch (error) {
                // Não bloqueia a edição nem a cópia.
            }
        }
        function updateRows() {
            const currentRows = rows();
            currentRows.forEach((row, index) => {
                row.dataset.blockerRow = index;
                row.style.background = index % 2 ? '#f8faff' : '#ffffff';
                row.querySelector('[data-blocker-field="theme"]').setAttribute('aria-label', 'Tema do bloqueador ' + (index + 1));
                row.querySelector('[data-blocker-field="impact"]').setAttribute('aria-label', 'Impacto do bloqueador ' + (index + 1));
                const remove = row.querySelector('[data-remove-blocker]');
                remove.setAttribute('aria-label', 'Remover bloqueador ' + (index + 1));
                remove.disabled = currentRows.length === 1;
            });
        }
        function resize(field) {
            if (!field.isConnected) return;
            field.style.height = 'auto';
            field.style.height = (field.scrollHeight + 2) + 'px';
        }
        function addRow(saved = {}, focus = false) {
            const row = rowTemplate.cloneNode(true);
            body.appendChild(row);
            row.querySelectorAll('[data-blocker-field]').forEach(field => {
                if (saved && typeof saved[field.dataset.blockerField] === 'string') {
                    field.value = saved[field.dataset.blockerField];
                }
                resize(field);
                field.addEventListener('input', () => {
                    resize(field);
                    save();
                });
            });
            row.querySelector('[data-remove-blocker]').addEventListener('click', () => {
                if (rows().length === 1) return;
                const neighbor = row.nextElementSibling || row.previousElementSibling;
                row.remove();
                updateRows();
                save();
                neighbor.querySelector('[data-blocker-field="theme"]').focus();
            });
            updateRows();
            if (focus) row.querySelector('[data-blocker-field="theme"]').focus();
        }
        body.replaceChildren();
        (savedRows.length ? savedRows : [{}]).forEach(saved => addRow(saved));
        document.querySelector('[data-add-blocker]').addEventListener('click', () => {
            addRow({}, true);
            save();
        });
        save();
        window.addEventListener('resize', () => fields().forEach(resize));
    }
    initializeBlockers();
`;
