// ========== CONFIGURATION ==========
const CONFIG = {
    API_URL: 'http://localhost:8000/api',
    ANIMATION_DURATION: 200,
    STAGGER_DELAY: 50,
};

// ========== STATE ==========
const state = {
    editor: null,
    currentTab: 'results',
    isAnimating: false,
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

    /**
     * Display results as animated cards
     */
    async displayResults(data) {
        const container = document.getElementById('results');
        const infoBar = document.getElementById('results-info');
        
        // Animate out existing cards
        await this.animateCardsOut(container);
        
        // Handle no columns
        if (!data.columns || data.columns.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon">✓</div>
                    <p>Query executed but returned no columns</p>
                </div>
            `;
            infoBar.innerHTML = '';
            return;
        }

        // Handle no rows
        if (data.rows.length === 0) {
            container.innerHTML = `
                <div class="no-results">
                    <div class="no-results__icon">📭</div>
                    <p class="no-results__text">No rows match your query</p>
                </div>
            `;
            infoBar.innerHTML = `
                <span>Columns: ${data.columns.join(', ')}</span>
                <span class="results-info__count">0 rows</span>
            `;
            return;
        }

        // Show results info
        infoBar.innerHTML = `
            <span>Columns: ${data.columns.join(', ')}</span>
            <span class="results-info__count">${data.row_count} row${data.row_count !== 1 ? 's' : ''}</span>
        `;

        // Clear container
        container.innerHTML = '';

        // Create and animate in cards
        data.rows.forEach((row, rowIndex) => {
            const card = this.createCard(data.columns, row, rowIndex);
            container.appendChild(card);
            
            // Staggered animation delay
            setTimeout(() => {
                card.classList.add('result-card--entering');
            }, rowIndex * CONFIG.STAGGER_DELAY);
        });
    },

    /**
     * Create a single result card
     */
    createCard(columns, row, rowIndex) {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.style.opacity = '0';
        
        // Row number indicator
        let html = `<div class="result-card__row-number">Row ${rowIndex + 1}</div>`;
        
        // Column-value pairs
        columns.forEach((col, colIndex) => {
            const value = row[colIndex];
            const isNull = value === null;
            const displayValue = isNull ? 'NULL' : this.escapeHtml(String(value));
            const valueClass = isNull ? 'result-card__value result-card__value--null' : 'result-card__value';
            
            html += `
                <div class="result-card__field">
                    <div class="result-card__label">${this.escapeHtml(col)}</div>
                    <div class="${valueClass}">${displayValue}</div>
                </div>
            `;
        });
        
        card.innerHTML = html;
        return card;
    },

    /**
     * Animate existing cards out
     */
    animateCardsOut(container) {
        return new Promise((resolve) => {
            const cards = container.querySelectorAll('.result-card');
            
            if (cards.length === 0) {
                resolve();
                return;
            }

            state.isAnimating = true;
            
            cards.forEach((card, index) => {
                card.classList.remove('result-card--entering');
                card.classList.add('result-card--exiting');
            });

            // Wait for animation to complete
            setTimeout(() => {
                state.isAnimating = false;
                resolve();
            }, CONFIG.ANIMATION_DURATION);
        });
    },

    clearResults() {
        const container = document.getElementById('results');
        const infoBar = document.getElementById('results-info');
        
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state__icon">⚡</div>
                <p>Run a query to see results</p>
            </div>
        `;
        infoBar.innerHTML = '';
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
        document.querySelectorAll('.tab').forEach(tab => {
            const isActive = tab.dataset.tab === tabName;
            tab.classList.toggle('tab-active', isActive);
        });

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
        // Prevent running if animation is in progress
        if (state.isAnimating) return;
        
        const query = editor.getValue();

        if (!query) {
            ui.showMessage('Please enter a SQL query', 'error');
            return;
        }

        ui.switchTab('results');

        try {
            const result = await api.executeQuery(query);

            if (result.success) {
                await ui.displayResults(result);
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
                '<p style="color: #dc2626;">Failed to load schema. Is the backend running?</p>';
        }
    }
};

// ========== INITIALIZE ==========
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});