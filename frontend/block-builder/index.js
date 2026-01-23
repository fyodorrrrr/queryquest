import { BLOCK_CATEGORIES, VALID_CONNECTIONS, FRIENDLY_LABELS, API_CONFIG } from './config.js';
import { DragDropManager } from './drag-drop.js';
import { CanvasManager } from './canvas.js';
import { SQLGenerator } from './sql-generator.js';
import { getFriendlyLabel } from './utils.js';

/**
 * Main SQL Block Builder class
 * Coordinates between different managers for drag-drop, canvas, and SQL generation
 */
export class SQLBlockBuilder {
    constructor() {
        this.canvas = document.getElementById('query-canvas');
        this.output = document.getElementById('generated-sql-output');
        this.blocks = [];
        this.blockIdCounter = 0;
        
        // Initialize managers
        this.dragDropManager = new DragDropManager(this);
        this.canvasManager = new CanvasManager(this);
        this.sqlGenerator = new SQLGenerator(this);
        
        this.init();
    }
    
    /**
     * Initialize the block builder
     */
    init() {
        this.setupBlockLabels();
        this.dragDropManager.init();
        this.setupClearButton();
        this.setupRunButton();
        this.setupTabs();
        this.updateAvailableBlocks();
        this.loadInitialTables();
    }
    
    /**
     * Setup tab switching
     */
    setupTabs() {
        const tabs = document.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('tab-active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('tab-content-active'));
                
                tab.classList.add('tab-active');
                const tabId = tab.dataset.tab;
                document.getElementById(`${tabId}-tab`).classList.add('tab-content-active');
            });
        });
    }
    
    /**
     * Load and display initial tables (employees and departments)
     */
    async loadInitialTables() {
        const resultsDiv = document.getElementById('results');
        
        // Create the initial tables structure
        resultsDiv.innerHTML = `
            <div class="initial-tables" id="initial-tables">
                <div class="initial-table-card" id="employees-preview">
                    <h4>👥 employees</h4>
                    <div class="table-loading">Loading...</div>
                </div>
                <div class="initial-table-card" id="departments-preview">

                    <h4>🏢 departments</h4>
                    <div class="table-loading">Loading...</div>
                </div>
            </div>
            <div id="query-result-container"></div>
        `;
        
        // Fetch employees table
        await this.fetchAndRenderTable('employees', 'employees-preview');
        
        // Fetch departments table
        await this.fetchAndRenderTable('departments', 'departments-preview');
    }
    
    /**
     * Fetch and render a table preview
     */
    async fetchAndRenderTable(tableName, containerId) {
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.execute}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: `SELECT * FROM ${tableName}` })
            });
            const data = await response.json();
            
            if (data.success && data.rows) {
                this.renderInitialTable(containerId, data.columns, data.rows);
            } else {
                this.setTableError(containerId, 'Failed to load');
            }
        } catch (error) {
            this.setTableError(containerId, 'Connection error');
        }
    }
    
    /**
     * Set error message for a table container
     */
    setTableError(containerId, message) {
        const loadingEl = document.querySelector(`#${containerId} .table-loading`);
        if (loadingEl) {
            loadingEl.textContent = message;
            loadingEl.classList.add('table-error');
        }
    }
    
    /**
     * Render an initial table preview
     */
    renderInitialTable(containerId, columns, rows) {
        const container = document.getElementById(containerId);
        const loadingEl = container.querySelector('.table-loading');
        
        if (!loadingEl) return;
        
        if (!rows || rows.length === 0) {
            loadingEl.textContent = 'No data';
            return;
        }
        
        let tableHtml = '<div class="mini-table-wrapper"><table class="mini-table"><thead><tr>';
        columns.forEach(col => {
            tableHtml += `<th>${col}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        
        rows.forEach(row => {
            tableHtml += '<tr>';
            row.forEach(cell => {
                tableHtml += `<td>${cell ?? '<span class="null-value">NULL</span>'}</td>`;
            });
            tableHtml += '</tr>';
        });
        
        tableHtml += '</tbody></table></div>';
        loadingEl.outerHTML = tableHtml;
    }
    
    /**
     * Update menu block labels with friendly names
     */
    setupBlockLabels() {
        const menuBlocks = document.querySelectorAll('.block-menu .block');
        menuBlocks.forEach(block => {
            const type = block.dataset.type;
            if (FRIENDLY_LABELS[type] && !block.classList.contains('block--value-input')) {
                block.innerHTML = `
                    <span class="block-label">${FRIENDLY_LABELS[type]}</span>
                    <span class="block-sql">${type}</span>
                `;
            }
        });
    }
    
    // === Delegated methods ===
    
    /**
     * Add a block to the canvas
     * @param {Object} data - Block data
     */
    addBlockToCanvas(data) {
        this.canvasManager.addBlock(data);
    }
    
    /**
     * Add parameter to function slot
     */
    addParameterToSlot(slotEl, data, parentBlockId) {
        this.canvasManager.addParameterToSlot(slotEl, data, parentBlockId);
    }
    
    /**
     * Highlight function slots for dropping
     */
    highlightFunctionSlots(show) {
        this.canvasManager.highlightFunctionSlots(show);
    }
    
    /**
     * Check if a block type can connect to the current sequence
     * @param {string} blockType
     * @returns {boolean}
     */
    canConnect(blockType) {
        return this.sqlGenerator.canConnect(blockType);
    }
    
    /**
     * Generate SQL from current blocks
     */
    generateSQL() {
        const sql = this.sqlGenerator.generate();
        this.output.textContent = sql;
        this.validateQuery(sql);
    }
    
    /**
     * Show connection error message
     * @param {string} blockType
     */
    showConnectionError(blockType) {
        const label = getFriendlyLabel(blockType);
        this.showMessage(`❌ Cannot add "${label}" here. Try a different block.`, 'error');
        
        this.canvas.classList.add('connection-error');
        setTimeout(() => this.canvas.classList.remove('connection-error'), 500);
    }
    
    /**
     * Update which blocks are available based on current state
     */
    updateAvailableBlocks() {
        const lastCategory = this.sqlGenerator.getLastBlockCategory();
        const validNext = VALID_CONNECTIONS[lastCategory] || [];
        
        const menuBlocks = document.querySelectorAll('.block-menu .block');
        const hasEmptyFunctionSlot = this.canvas.querySelector('.param-slot.empty') !== null;
        
        menuBlocks.forEach(block => {
            const type = block.dataset.type;
            const category = BLOCK_CATEGORIES[type] || 'UNKNOWN';
            
            const isValid = validNext.includes(category) || validNext.includes(type);
            
            block.classList.toggle('block--disabled', !isValid);
            block.classList.toggle('block--available', isValid);
            block.draggable = isValid;
            
            // Hint for columns that can be dropped into functions
            if (category === 'COLUMN' && hasEmptyFunctionSlot) {
                block.classList.add('can-drop-in-function');
            } else {
                block.classList.remove('can-drop-in-function');
            }
        });
    }
    
    /**
     * Validate and update UI based on query completeness
     * @param {string} sql
     */
    validateQuery(sql) {
        const isComplete = this.sqlGenerator.isQueryComplete();
        const outputContainer = this.output.parentElement;
        
        outputContainer.classList.remove('sql-valid', 'sql-incomplete');
        outputContainer.classList.add(isComplete ? 'sql-valid' : 'sql-incomplete');
        
        const runBtn = document.getElementById('run-builder-btn');
        if (runBtn) {
            runBtn.disabled = !isComplete;
            runBtn.classList.toggle('btn--disabled', !isComplete);
        }
    }
    
    // === Button setup ===
    
    setupClearButton() {
        const clearBtn = document.getElementById('clear-builder-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.canvasManager.clear());
        }
    }
    
    setupRunButton() {
        const runBtn = document.getElementById('run-builder-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runQuery());
        }
    }
    
    // === Query execution ===
    
    async runQuery() {
        const sql = this.output.textContent;
        
        if (sql === '-- Your query will appear here' || !sql.trim()) {
            this.showMessage('Please build a query first', 'error');
            return;
        }
        
        if (!this.sqlGenerator.isQueryComplete()) {
            this.showMessage('Please complete your query (need SELECT, columns, FROM, and a table)', 'error');
            return;
        }
        
        // Switch to results tab
        document.querySelector('[data-tab="results"]').click();
        
        const initialTables = document.getElementById('initial-tables');
        const queryResultContainer = document.getElementById('query-result-container');
        const resultsInfo = document.getElementById('results-info');
        
        // Show loading state
        this.showMessage('Running query...', 'info');
        queryResultContainer.innerHTML = '';
        
        // Remove dimmed state while loading
        if (initialTables) {
            initialTables.classList.remove('dimmed');
        }
        
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.execute}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sql })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.showMessage(`✅ Query executed successfully! ${data.row_count} row(s) returned.`, 'success');
                
                // Dim the initial tables to highlight the result
                if (initialTables) {
                    initialTables.classList.add('dimmed');
                }
                
                // Update results info
                if (resultsInfo) {
                    resultsInfo.innerHTML = `<span class="results-count">📊 ${data.row_count} row${data.row_count !== 1 ? 's' : ''} returned</span>`;
                }
                
                // Display query result below initial tables
                this.displayQueryResult(queryResultContainer, data, sql);
            } else {
                this.showMessage(data.error, 'error');
            }
        } catch (error) {
            this.showMessage('Failed to connect to server. Make sure the backend is running.', 'error');
        }
    }
    
    // === UI helpers ===
    
    showMessage(text, type) {
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.innerHTML = `<div class="message-${type}">${text}</div>`;
            
            if (type === 'success') {
                setTimeout(() => {
                    messageEl.innerHTML = '';
                }, 5000);
            }
        }
    }
    
    /**
     * Display query result in a dedicated section below initial tables
     */
    displayQueryResult(container, data, sql) {
        if (!container) return;
        
        if (data.rows.length === 0) {
            container.innerHTML = `
                <div class="query-result-section">
                    <h4>🎯 Query Result</h4>
                    <div class="query-sql-display">${this.escapeHtml(sql)}</div>
                    <div class="empty-result">
                        <span>📭</span>
                        <p>No rows returned</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="query-result-section">
                <h4>🎯 Query Result</h4>
                <div class="query-sql-display">${this.escapeHtml(sql)}</div>
                <div class="result-table-wrapper">
                    <table class="result-table">
                        <thead>
                            <tr>${data.columns.map(col => `<th>${col}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${data.rows.map(row => `
                                <tr>
                                    ${row.map(cell => `
                                        <td>${cell !== null ? cell : '<span class="null-value">NULL</span>'}</td>
                                    `).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }
    
    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Keep old displayResults for backwards compatibility
    displayResults(data) {
        this.displayQueryResult(document.getElementById('query-result-container'), data, this.output.textContent);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sqlBlockBuilder = new SQLBlockBuilder();
});