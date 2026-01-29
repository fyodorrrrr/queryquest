import { BLOCK_CATEGORIES, VALID_CONNECTIONS, FRIENDLY_LABELS, API_CONFIG } from './config.js';
import { DragDropManager } from './drag-drop.js';
import { CanvasManager } from './canvas.js';
import { SQLGenerator } from './sql-generator.js';
import { getFriendlyLabel } from './utils.js';
import { getTooltip } from './tooltips.js';

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
        this.applyTooltips();  // Add this line
        this.dragDropManager.init();
        this.setupClearButton();
        this.setupRunButton();
        this.setupTabs();
        this.updateAvailableBlocks();
        this.loadInitialTables();
        this.createToastContainer();
    }
    
    /**
     * Apply tooltips to all blocks in the block menu
     */
    applyTooltips() {
        const blocks = document.querySelectorAll('.block-menu .block');
        blocks.forEach(block => {
            const blockType = block.getAttribute('data-type');
            const tooltip = getTooltip(blockType);
            block.setAttribute('data-tooltip', tooltip);
        });
    }
    
    /**
     * Create toast notification container
     */
    createToastContainer() {
        if (!document.querySelector('.toast-container')) {
            const container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }
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
        
        resultsDiv.innerHTML = `
            <div class="results-dashboard">
                <!-- Stats Bar -->
                <div class="stats-bar">
                    <div class="stat-item">
                        <span class="stat-icon">📊</span>
                        <div class="stat-content">
                            <span class="stat-label">Tables Available</span>
                            <span class="stat-value">2</span>
                        </div>
                    </div>
                    <div class="stat-item stat-highlight" id="result-stat">
                        <span class="stat-icon">🎯</span>
                        <div class="stat-content">
                            <span class="stat-label">Rows Returned</span>
                            <span class="stat-value" id="row-count-display">--</span>
                        </div>
                    </div>
                </div>

                <!-- Source Data Section -->
                <section class="dashboard-section source-section" id="source-section">
                    <div class="section-header">
                        <div class="section-header-content">
                            <h3>📁 Source Data <button class="help-icon" data-help="source" title="What is this?">?</button></h3>
                            <p class="section-subtitle">Tables you can query</p>
                        </div>
                        <button class="toggle-btn" id="toggle-source" title="Toggle source data">
                            <span>Hide</span>
                            <span class="toggle-icon">▲</span>
                        </button>
                    </div>
                    <div class="section-body collapsible-content" id="source-content">
                        <div class="table-grid">
                            <div class="mini-table-card" id="employees-preview">
                                <div class="mini-table-header">
                                    <span>👥</span> 
                                    <span>employees</span>
                                    <span class="row-badge" id="employees-count">...</span>
                                </div>
                                <div class="mini-table-body">
                                    <div class="table-loading">
                                        <span class="loading-spinner"></span>
                                        Loading...
                                    </div>
                                </div>
                            </div>
                            <div class="mini-table-card" id="departments-preview">
                                <div class="mini-table-header">
                                    <span>🏢</span> 
                                    <span>departments</span>
                                    <span class="row-badge" id="departments-count">...</span>
                                </div>
                                <div class="mini-table-body">
                                    <div class="table-loading">
                                        <span class="loading-spinner"></span>
                                        Loading...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <!-- Visual Flow Indicator -->
                <div class="flow-indicator" id="flow-indicator">
                    <div class="flow-line"></div>
                    <div class="flow-arrow">
                        <span>⬇️</span>
                        <span>Your query transforms this data</span>
                    </div>
                    <div class="flow-line"></div>
                </div>

                <!-- Query Result Section -->
                <section class="dashboard-section result-section">
                    <div class="section-header">
                        <div class="section-header-content">
                            <h3>✨ Query Result</h3>
                            <p class="section-subtitle">Output from your SQL</p>
                        </div>
                    </div>
                    <div class="section-body" id="query-result-container">
                        <div class="placeholder-message">
                            <div class="placeholder-icon">🔮</div>
                            <h4>Run a query to see results</h4>
                            <p>Build your query using blocks, then click "Run Query"</p>
                            <button class="btn btn-help" id="show-examples-btn">
                                <span>💡</span>
                                <span>Need Help?</span>
                            </button>
                        </div>
                    </div>
                </section>
            </div>
        `;
        
        // Setup toggle functionality
        this.setupSourceToggle();
        
        // Setup examples modal
        this.setupExamplesModal();
        
        // Setup help icons (for source data)
        this.setupHelpIcons();
        
        // Fetch and render tables
        await this.fetchAndRenderTable('employees', 'employees-preview');
        await this.fetchAndRenderTable('departments', 'departments-preview');
    }
    
    /**
     * Setup source data toggle button
     */
    setupSourceToggle() {
        const toggleBtn = document.getElementById('toggle-source');
        const sourceContent = document.getElementById('source-content');
        const sourceSection = document.getElementById('source-section');
        
        if (!toggleBtn || !sourceContent) return;
        
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = sourceContent.classList.toggle('collapsed');
            toggleBtn.classList.toggle('collapsed', isCollapsed);
            sourceSection.classList.toggle('collapsed', isCollapsed);
            
            // Update button text
            const textSpan = toggleBtn.querySelector('span:first-child');
            if (textSpan) {
                textSpan.textContent = isCollapsed ? 'Show' : 'Hide';
            }
        });
    }

    /**
     * Setup examples modal functionality with step navigation
     */
    setupExamplesModal() {
        const showBtn = document.getElementById('show-examples-btn');
        const closeBtn = document.getElementById('close-examples-btn');
        const modal = document.getElementById('examples-modal');
        const prevBtn = document.getElementById('modal-prev');
        const nextBtn = document.getElementById('modal-next');

        let currentStep = 1;
        const totalSteps = 3;

        const updateStep = (step) => {
            currentStep = step;
            
            // Update step content
            modal.querySelectorAll('.modal-step').forEach(s => s.classList.remove('active'));
            modal.querySelector(`.modal-step[data-step="${step}"]`)?.classList.add('active');
            
            // Update step dots
            modal.querySelectorAll('.step-dot').forEach(dot => {
                const dotStep = parseInt(dot.dataset.step);
                dot.classList.remove('active', 'completed');
                if (dotStep === step) dot.classList.add('active');
                if (dotStep < step) dot.classList.add('completed');
            });
            
            // Update navigation buttons
            prevBtn.style.visibility = step === 1 ? 'hidden' : 'visible';
            nextBtn.textContent = step === totalSteps ? "Got it! ✓" : "Next →";
        };

        if (showBtn && modal) {
            showBtn.addEventListener('click', () => {
                modal.style.display = 'flex';
                updateStep(1); // Reset to step 1
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (currentStep > 1) updateStep(currentStep - 1);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (currentStep < totalSteps) {
                    updateStep(currentStep + 1);
                } else {
                    modal.style.display = 'none';
                }
            });
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                modal.style.display = 'none';
            }
        });
    }

    /**
     * Setup help icon modals
     */
    setupHelpIcons() {
        const helpModals = {
            'blocks': 'blocks-help-modal',
            'source': 'source-help-modal'
        };

        // Open modal on help icon click
        document.querySelectorAll('.help-icon').forEach(icon => {
            icon.addEventListener('click', (e) => {
                e.stopPropagation();
                const helpKey = icon.dataset.help;
                const modalId = helpModals[helpKey];
                const modal = document.getElementById(modalId);
                
                if (modal) {
                    modal.style.display = 'flex';
                }
            });
        });

        // Close modal on close button click
        document.querySelectorAll('.help-modal__close').forEach(btn => {
            btn.addEventListener('click', () => {
                const modalId = btn.dataset.close;
                const modal = document.getElementById(modalId);
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modal on backdrop click
        document.querySelectorAll('.help-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });

        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.help-modal').forEach(modal => {
                    modal.style.display = 'none';
                });
            }
        });
    }
    
    /**
     * Dim source data section (call after query runs)
     */
    dimSourceData(dim = true) {
        const sourceSection = document.getElementById('source-section');
        const flowIndicator = document.getElementById('flow-indicator');
        
        if (sourceSection) {
            sourceSection.classList.toggle('dimmed', dim);
        }
        if (flowIndicator) {
            flowIndicator.classList.toggle('dimmed', dim);
        }
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
                // Update row count badge
                const countBadge = document.getElementById(`${tableName}-count`);
                if (countBadge) {
                    countBadge.textContent = `${data.rows.length} rows`;
                }
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
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const loadingEl = container.querySelector('.table-loading');
        const countBadge = document.getElementById(`${containerId.replace('-preview', '')}-count`);
        
        if (loadingEl) {
            loadingEl.innerHTML = `<span style="color: var(--error);">❌ ${message}</span>`;
        }
        if (countBadge) {
            countBadge.textContent = 'error';
            countBadge.style.background = 'var(--error-light)';
            countBadge.style.color = 'var(--error)';
        }
    }
    
    /**
     * Render an initial table preview
     */
    renderInitialTable(containerId, columns, rows) {
        const container = document.getElementById(containerId);
        const bodyEl = container?.querySelector('.mini-table-body');
        
        if (!bodyEl) return;
        
        if (!rows || rows.length === 0) {
            bodyEl.innerHTML = '<div class="table-loading">No data</div>';
            return;
        }
        
        // Build compact table
        let tableHtml = '<table class="preview-table"><thead><tr>';
        columns.forEach(col => {
            tableHtml += `<th>${this.escapeHtml(col)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        
        rows.forEach(row => {
            tableHtml += '<tr>';
            row.forEach(cell => {
                const displayValue = cell !== null ? this.escapeHtml(String(cell)) : '<span class="null-value">NULL</span>';
                tableHtml += `<td>${displayValue}</td>`;
            });
            tableHtml += '</tr>';
        });
        
        tableHtml += '</tbody></table>';
        bodyEl.innerHTML = tableHtml;
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
        this.showToast(`Cannot add "${label}" here. Try a different block.`, 'error');
        
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
            this.showToast('Please build a query first', 'error');
            return;
        }
        
        if (!this.sqlGenerator.isQueryComplete()) {
            this.showToast('Please complete your query (need SELECT, columns, FROM, and a table)', 'error');
            return;
        }
        
        // Switch to results tab
        document.querySelector('[data-tab="results"]').click();
        
        const initialTables = document.getElementById('initial-tables');
        const queryResultContainer = document.getElementById('query-result-container');
        const resultsInfo = document.getElementById('results-info');
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
                this.showToast(`Query executed successfully! ${data.row_count} row(s) returned.`, 'success');
                
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
                this.showToast(data.error || 'Query failed', 'error');
            }
        } catch (error) {
            this.removeToast(loadingToast);
            this.showToast('Failed to connect to server. Make sure the backend is running.', 'error');
        }
    }
    
    // === Toast notification system ===
    
    /**
     * Show a floating toast notification
     * @param {string} message - The message to display
     * @param {string} type - 'success', 'error', or 'info'
     * @param {boolean} autoClose - Whether to auto-close (default: true)
     * @returns {HTMLElement} The toast element
     */
    showToast(message, type = 'info', autoClose = true) {
        const container = document.querySelector('.toast-container');
        if (!container) return null;
        
        const icons = {
            success: '✅',
            error: '❌',
            info: '⏳'
        };
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
            <span class="toast-message">${message}</span>
            <button class="toast-close" aria-label="Close">×</button>
        `;
        
        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.removeToast(toast);
        });
        
        container.appendChild(toast);
        
        // Auto close after delay
        if (autoClose) {
            const delay = type === 'error' ? 5000 : 3000;
            setTimeout(() => {
                this.removeToast(toast);
            }, delay);
        }
        
        return toast;
    }
    
    /**
     * Remove a toast with animation
     * @param {HTMLElement} toast - The toast element to remove
     */
    removeToast(toast) {
        if (!toast || !toast.parentElement) return;
        
        toast.classList.add('toast-exit');
        setTimeout(() => {
            if (toast.parentElement) {
                toast.remove();
            }
        }, 300);
    }
    
    /**
     * Show message (legacy method for backwards compatibility)
     */
    showMessage(text, type) {
        this.showToast(text, type);
    }
    
    /**
     * Display query result in the dashboard
     */
    displayQueryResult(container, data, sql) {
        if (!container) return;
        
        // Dim the source data to focus on results
        this.dimSourceData(true);
        
        // Update row count display in stats bar
        const rowCountDisplay = document.getElementById('row-count-display');
        if (rowCountDisplay) {
            rowCountDisplay.textContent = data.rows.length;
        }
        
        // Pulse animation on stat
        const resultStat = document.getElementById('result-stat');
        if (resultStat && data.rows.length > 0) {
            resultStat.style.animation = 'none';
            resultStat.offsetHeight;
            resultStat.style.animation = 'pulse 0.5s ease';
        }
        
        if (data.rows.length === 0) {
            container.innerHTML = `
                <div class="result-content">
                    <div class="sql-display">
                        <span class="sql-label">✅ Executed SQL:</span>
                        <code>${this.escapeHtml(sql)}</code>
                    </div>
                    <div class="empty-result">
                        <span class="empty-icon">📭</span>
                        <h4>No rows returned</h4>
                        <p>Query ran successfully but matched no data</p>
                    </div>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="result-content">
                <div class="sql-display">
                    <span class="sql-label">✅ Executed SQL:</span>
                    <code>${this.escapeHtml(sql)}</code>
                </div>
                <div class="result-info">
                    <span class="result-badge success">🎉 ${data.rows.length} row${data.rows.length !== 1 ? 's' : ''} returned</span>
                </div>
                <div class="result-table-wrapper">
                    <table class="result-table">
                        <thead>
                            <tr>${data.columns.map(col => `<th>${this.escapeHtml(col)}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${data.rows.map(row => `
                                <tr>
                                    ${row.map(cell => `
                                        <td>${cell !== null ? this.escapeHtml(String(cell)) : '<span class="null-value">NULL</span>'}</td>
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