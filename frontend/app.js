// ========== CONFIGURATION ==========
const CONFIG = {
    API_URL: 'http://localhost:8000/api',
};

// ========== STATE ==========
const state = {
    editor: null,
    currentTab: 'results'
};

// ========== API FUNCTIONS ==========
const api = {
    async executeQuery(query) {
        const response = await fetch(`${CONFIG.API_URL}/execute/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query })
        });
        return await response.json();
    },

    async getSchema() {
        const response = await fetch(`${CONFIG.API_URL}/schema/`);
        return await response.json();
    }
};

// ========== UI FUNCTIONS ==========
const ui = {
    showMessage(text, type) {
        const msg = document.getElementById('message');
        msg.innerHTML = `<div class="message-box message-${type}">${this.escapeHtml(text)}</div>`;
        
        if (type === 'success') {
            setTimeout(() => { msg.innerHTML = ''; }, 4000);
        }
    },

    displayResults(data) {
        const container = document.getElementById('results');
        
        if (!data.columns || data.columns.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon">✓</div>
                    <p>Query executed but returned no columns</p>
                </div>
            `;
            return;
        }

        let html = '<table><thead><tr>';
        data.columns.forEach(col => {
            html += `<th>${this.escapeHtml(col)}</th>`;
        });
        html += '</tr></thead><tbody>';

        if (data.rows.length === 0) {
            html += `<tr><td colspan="${data.columns.length}" style="text-align: center; color: #858585;">No rows returned</td></tr>`;
        } else {
            data.rows.forEach(row => {
                html += '<tr>';
                row.forEach(cell => {
                    const value = cell !== null ? this.escapeHtml(String(cell)) : '<span style="color: #858585;">NULL</span>';
                    html += `<td>${value}</td>`;
                });
                html += '</tr>';
            });
        }

        html += '</tbody></table>';
        container.innerHTML = html;
    },

    clearResults() {
        document.getElementById('results').innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">⚡</div>
                <p>Run a query to see results</p>
            </div>
        `;
    },

    displaySchema(schema) {
        const container = document.getElementById('schema-container');
        let html = '';

        schema.tables.forEach(table => {
            html += `
                <div class="table-box">
                    <div class="table-header">📋 ${this.escapeHtml(table.name)}</div>
                    <div class="column-list">
            `;

            table.columns.forEach(col => {
                html += `
                    <div class="column-item">
                        <span class="col-name">${this.escapeHtml(col.name)}</span>
                        <div>
                            <span class="col-type">${this.escapeHtml(col.type)}</span>
                            ${col.constraint ? `<span class="col-constraint">${this.escapeHtml(col.constraint)}</span>` : ''}
                        </div>
                    </div>
                `;
            });

            html += `</div></div>`;
        });

        container.innerHTML = html;
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('tab-active', isActive);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            const isActive = content.id === `${tabName}-tab`;
            content.classList.toggle('tab-content-active', isActive);
        });

        state.currentTab = tabName;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// ========== EDITOR FUNCTIONS ==========
const editor = {
    init() {
        state.editor = document.getElementById('sql-editor');
        this.setupKeyboardShortcuts();
    },

    getValue() {
        return state.editor.value.trim();
    },

    setValue(value) {
        state.editor.value = value;
        state.editor.focus();
    },

    clear() {
        state.editor.value = '';
        state.editor.focus();
    },

    setupKeyboardShortcuts() {
        state.editor.addEventListener('keydown', (e) => {
            // Ctrl+Enter to run query
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                app.runQuery();
            }

            // Tab for indentation
            if (e.key === 'Tab') {
                e.preventDefault();
                const start = state.editor.selectionStart;
                const end = state.editor.selectionEnd;
                const spaces = '    ';
                
                state.editor.value = 
                    state.editor.value.substring(0, start) + 
                    spaces + 
                    state.editor.value.substring(end);
                
                state.editor.selectionStart = state.editor.selectionEnd = start + spaces.length;
            }
        });
    }
};

// ========== MAIN APP ==========
const app = {
    async init() {
        editor.init();
        this.setupEventListeners();
        await this.loadSchema();
    },

    setupEventListeners() {
        // Run button
        document.getElementById('run-btn').addEventListener('click', () => {
            this.runQuery();
        });

        // Clear button
        document.getElementById('clear-btn').addEventListener('click', () => {
            editor.clear();
        });

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                ui.switchTab(e.target.dataset.tab);
            });
        });

        // Example queries
        document.querySelectorAll('.example-query').forEach(item => {
            item.addEventListener('click', (e) => {
                editor.setValue(e.target.textContent);
            });
        });
    },

    async runQuery() {
        const query = editor.getValue();

        if (!query) {
            ui.showMessage('Please enter a SQL query', 'error');
            return;
        }

        ui.switchTab('results');

        try {
            const result = await api.executeQuery(query);

            if (result.success) {
                ui.displayResults(result);
                ui.showMessage(`✓ Query executed successfully (${result.row_count} rows)`, 'success');
            } else {
                ui.showMessage(`✗ ${result.error}`, 'error');
                ui.clearResults();
            }
        } catch (error) {
            ui.showMessage('Failed to connect to backend. Make sure it\'s running on port 8000.', 'error');
            ui.clearResults();
        }
    },

    async loadSchema() {
        try {
            const schema = await api.getSchema();
            ui.displaySchema(schema);
        } catch (error) {
            document.getElementById('schema-container').innerHTML = 
                '<p style="color: #f48771;">Failed to load schema. Is the backend running?</p>';
        }
    }
};

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});