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
        this.updateAvailableBlocks();
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
        
        try {
            const response = await fetch(`${API_CONFIG.baseUrl}${API_CONFIG.endpoints.execute}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: sql })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayResults(data);
                this.showMessage(`✅ Query executed successfully! ${data.row_count} row(s) returned.`, 'success');
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
    
    displayResults(data) {
        const resultsContainer = document.getElementById('results');
        const resultsInfo = document.getElementById('results-info');
        
        if (resultsInfo) {
            resultsInfo.textContent = `${data.row_count} row(s) returned`;
        }
        
        if (!resultsContainer) return;
        
        if (data.rows.length === 0) {
            resultsContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state__icon">📭</div>
                    <p>No results found</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = `
            <div class="results-table-wrapper">
                <table class="results-table">
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
        `;
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.sqlBlockBuilder = new SQLBlockBuilder();
});