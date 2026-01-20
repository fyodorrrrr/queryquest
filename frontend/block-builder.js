class SQLBlockBuilder {
    constructor() {
        this.canvas = document.getElementById('query-canvas');
        this.output = document.getElementById('generated-sql-output');
        this.blocks = [];
        this.blockIdCounter = 0;
        
        // Define valid connections (what can follow what)
        this.validConnections = {
            'START': ['SELECT'],
            'SELECT': ['DISTINCT', 'ALL', 'COLUMN', 'FUNCTION'],
            'DISTINCT': ['COLUMN', 'FUNCTION'],
            'ALL': ['COLUMN', 'FUNCTION'],
            'COLUMN': ['COLUMN', 'FROM', 'COMMA', 'FUNCTION'],
            'FUNCTION': ['COLUMN', 'FROM', 'COMMA', 'FUNCTION'],
            'COMMA': ['COLUMN', 'FUNCTION'],
            'FROM': ['TABLE'],
            'TABLE': ['WHERE', 'JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'END'],
            'JOIN': ['TABLE'],
            'ON': ['COLUMN'],
            'WHERE': ['COLUMN', 'FUNCTION'],
            'CONDITION_COLUMN': ['OPERATOR'],
            'OPERATOR': ['VALUE', 'COLUMN'],
            'VALUE': ['AND', 'OR', 'GROUP BY', 'ORDER BY', 'LIMIT', 'END'],
            'AND': ['COLUMN'],
            'OR': ['COLUMN'],
            'GROUP BY': ['COLUMN'],
            'GROUP_COLUMN': ['COLUMN', 'ORDER BY', 'LIMIT', 'END', 'COMMA'],
            'ORDER BY': ['COLUMN'],
            'ORDER_COLUMN': ['ASC', 'DESC', 'COLUMN', 'LIMIT', 'END', 'COMMA'],
            'ASC': ['COLUMN', 'LIMIT', 'END', 'COMMA'],
            'DESC': ['COLUMN', 'LIMIT', 'END', 'COMMA'],
            'LIMIT': ['NUMBER'],
            'NUMBER': ['END']
        };
        
        // Block categories for connection logic
        this.blockCategories = {
            'SELECT': 'SELECT',
            'DISTINCT': 'DISTINCT',
            'FROM': 'FROM',
            'WHERE': 'WHERE',
            'JOIN': 'JOIN',
            'ON': 'ON',
            'GROUP BY': 'GROUP BY',
            'ORDER BY': 'ORDER BY',
            'LIMIT': 'LIMIT',
            'AND': 'AND',
            'OR': 'OR',
            'ASC': 'ASC',
            'DESC': 'DESC',
            '=': 'OPERATOR',
            '!=': 'OPERATOR',
            '>': 'OPERATOR',
            '<': 'OPERATOR',
            '>=': 'OPERATOR',
            '<=': 'OPERATOR',
            'LIKE': 'OPERATOR',
            'IN': 'OPERATOR',
            'COUNT()': 'FUNCTION',
            'SUM()': 'FUNCTION',
            'AVG()': 'FUNCTION',
            'MIN()': 'FUNCTION',
            'MAX()': 'FUNCTION',
            'employees': 'TABLE',
            'departments': 'TABLE',
            '*': 'COLUMN',
            'id': 'COLUMN',
            'name': 'COLUMN',
            'department': 'COLUMN',
            'salary': 'COLUMN',
            'hire_date': 'COLUMN',
            'location': 'COLUMN',
            'number': 'VALUE',
            'text': 'VALUE'
        };
        
        // Friendly labels for blocks
        this.friendlyLabels = {
            'SELECT': '📋 Select',
            'DISTINCT': '🔹 Unique',
            'FROM': '📁 From Table',
            'WHERE': '🔍 Filter',
            'JOIN': '🔗 Join',
            'ON': '🎯 Match On',
            'GROUP BY': '📊 Group By',
            'ORDER BY': '↕️ Sort By',
            'LIMIT': '🔢 Limit',
            'AND': '➕ And',
            'OR': '⚡ Or',
            '=': 'equals',
            '!=': 'not equals',
            '>': 'greater than',
            '<': 'less than',
            '>=': 'at least',
            '<=': 'at most',
            'LIKE': 'matches',
            'IN': 'in list',
            'COUNT()': '🔢 Count',
            'SUM()': '➕ Sum',
            'AVG()': '📈 Average',
            'MIN()': '⬇️ Minimum',
            'MAX()': '⬆️ Maximum',
            'ASC': '⬆️ Ascending',
            'DESC': '⬇️ Descending',
            'employees': '👥 employees',
            'departments': '🏢 departments',
            '*': '✱ All Columns',
            'id': 'id',
            'name': 'name',
            'department': 'department',
            'salary': 'salary',
            'hire_date': 'hire_date',
            'location': 'location'
        };
        
        this.init();
    }
    
    init() {
        this.setupBlockLabels();
        this.setupDragAndDrop();
        this.setupClearButton();
        this.setupRunButton();
        this.updateAvailableBlocks();
    }
    
    setupBlockLabels() {
        // Update block labels to friendly names
        const menuBlocks = document.querySelectorAll('.block-menu .block');
        menuBlocks.forEach(block => {
            const type = block.dataset.type;
            if (this.friendlyLabels[type] && !block.classList.contains('block--value-input')) {
                block.innerHTML = `<span class="block-label">${this.friendlyLabels[type]}</span><span class="block-sql">${type}</span>`;
            }
        });
    }
    
    setupDragAndDrop() {
        const menuBlocks = document.querySelectorAll('.block-menu .block');
        menuBlocks.forEach(block => {
            block.addEventListener('dragstart', (e) => this.handleDragStart(e));
            block.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
        
        this.canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.canvas.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.canvas.addEventListener('drop', (e) => this.handleDrop(e));
    }
    
    handleDragStart(e) {
        const block = e.target.closest('.block');
        if (block.classList.contains('block--disabled')) {
            e.preventDefault();
            return;
        }
        
        const blockType = block.dataset.type;
        const blockClass = this.getBlockClass(block);
        
        const input = block.querySelector('.block-input');
        let inputValue = '';
        if (input) {
            inputValue = input.value;
        }
        
        e.dataTransfer.setData('text/plain', JSON.stringify({
            type: blockType,
            class: blockClass,
            inputValue: inputValue,
            isFromCanvas: block.classList.contains('canvas-block'),
            blockId: block.dataset.blockId || null
        }));
        
        e.dataTransfer.effectAllowed = 'copy';
        block.classList.add('dragging');
        
        // Highlight function slots if dragging a column
        if (this.blockCategories[blockType] === 'COLUMN') {
            this.highlightFunctionSlots(true);
        }
    }
    
    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.highlightFunctionSlots(false);
    }
    
    // Highlight empty function parameter slots when dragging columns
    highlightFunctionSlots(show) {
        const emptySlots = this.canvas.querySelectorAll('.param-slot.empty');
        emptySlots.forEach(slot => {
            if (show) {
                slot.closest('.canvas-block')?.classList.add('accepting-drop');
            } else {
                slot.closest('.canvas-block')?.classList.remove('accepting-drop');
            }
        });
    }
    
    handleDragOver(e) {
        e.preventDefault();
        
        const data = e.dataTransfer.getData('text/plain');
        if (data) {
            try {
                const blockData = JSON.parse(data);
                const canConnect = this.canConnect(blockData.type);
                
                this.canvas.classList.remove('drag-over', 'drag-valid', 'drag-invalid');
                this.canvas.classList.add('drag-over');
                this.canvas.classList.add(canConnect ? 'drag-valid' : 'drag-invalid');
            } catch (err) {
                this.canvas.classList.add('drag-over');
            }
        } else {
            this.canvas.classList.add('drag-over');
        }
    }
    
    handleDragLeave(e) {
        if (!this.canvas.contains(e.relatedTarget)) {
            this.canvas.classList.remove('drag-over', 'drag-valid', 'drag-invalid');
        }
    }
    
    handleDrop(e) {
        e.preventDefault();
        this.canvas.classList.remove('drag-over', 'drag-valid', 'drag-invalid');
        
        try {
            const data = JSON.parse(e.dataTransfer.getData('text/plain'));
            
            if (this.canConnect(data.type)) {
                this.addBlockToCanvas(data);
            } else {
                this.showConnectionError(data.type);
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    }
    
    getLastBlockCategory() {
        if (this.blocks.length === 0) return 'START';
        
        const lastBlock = this.blocks[this.blocks.length - 1];
        const type = lastBlock.type;
        
        const category = this.blockCategories[type] || 'UNKNOWN';
        
        if (category === 'COLUMN') {
            const prevBlocks = this.blocks.slice(0, -1);
            const lastKeyword = this.findLastKeyword(prevBlocks);
            
            if (lastKeyword === 'WHERE' || lastKeyword === 'AND' || lastKeyword === 'OR') {
                return 'CONDITION_COLUMN';
            }
            if (lastKeyword === 'GROUP BY') {
                return 'GROUP_COLUMN';
            }
            if (lastKeyword === 'ORDER BY') {
                return 'ORDER_COLUMN';
            }
        }
        
        if (category === 'VALUE') {
            return 'VALUE';
        }
        
        return category;
    }
    
    findLastKeyword(blocks) {
        const keywords = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'AND', 'OR'];
        for (let i = blocks.length - 1; i >= 0; i--) {
            if (keywords.includes(blocks[i].type)) {
                return blocks[i].type;
            }
        }
        return null;
    }
    
    canConnect(newBlockType) {
        const lastCategory = this.getLastBlockCategory();
        const newCategory = this.blockCategories[newBlockType] || 'UNKNOWN';
        
        const validNext = this.validConnections[lastCategory] || [];
        
        if (validNext.includes(newCategory)) {
            return true;
        }
        
        if (validNext.includes(newBlockType)) {
            return true;
        }
        
        if (newBlockType === ',' || newCategory === 'COMMA') {
            return lastCategory === 'COLUMN' || lastCategory === 'FUNCTION' || 
                   lastCategory === 'GROUP_COLUMN' || lastCategory === 'ORDER_COLUMN';
        }
        
        return false;
    }
    
    getBlockClass(block) {
        if (block.classList.contains('block--command')) return 'block--command';
        if (block.classList.contains('block--operator')) return 'block--operator';
        if (block.classList.contains('block--function')) return 'block--function';
        if (block.classList.contains('block--table')) return 'block--table';
        if (block.classList.contains('block--column')) return 'block--column';
        if (block.classList.contains('block--value')) return 'block--value';
        return '';
    }
    
    showConnectionError(blockType) {
        const label = this.friendlyLabels[blockType] || blockType;
        this.showMessage(`❌ Cannot add "${label}" here. Try a different block.`, 'error');
        
        this.canvas.classList.add('connection-error');
        setTimeout(() => this.canvas.classList.remove('connection-error'), 500);
    }
    
    addBlockToCanvas(data) {
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
        
        const blockId = this.blockIdCounter++;
        
        const blockEl = document.createElement('div');
        blockEl.className = `canvas-block ${data.class} puzzle-block`;
        blockEl.dataset.blockId = blockId;
        blockEl.dataset.type = data.type;
        
        // Add connector visuals
        if (this.blocks.length > 0) {
            blockEl.classList.add('has-left-connector');
        }
        
        // Create block content
        const contentWrapper = document.createElement('div');
        contentWrapper.className = 'block-content';
        
        const currentCategory = this.blockCategories[data.type];
        
        // Handle FUNCTION blocks with parameter slots
        if (currentCategory === 'FUNCTION') {
            const functionName = data.type.replace('()', '');
            
            const label = document.createElement('span');
            label.className = 'block-label';
            label.textContent = this.friendlyLabels[data.type] || functionName;
            contentWrapper.appendChild(label);
            
            const sqlLabel = document.createElement('span');
            sqlLabel.className = 'block-sql';
            sqlLabel.textContent = functionName;
            contentWrapper.appendChild(sqlLabel);
            
            // Create parameter slot container
            const paramsContainer = document.createElement('span');
            paramsContainer.className = 'function-params';
            
            const paramSlot = document.createElement('div');
            paramSlot.className = 'param-slot empty';
            paramSlot.dataset.paramIndex = '0';
            
            const slotPlaceholder = document.createElement('span');
            slotPlaceholder.className = 'slot-placeholder';
            slotPlaceholder.textContent = 'column';
            paramSlot.appendChild(slotPlaceholder);
            
            // Setup drop zone for this parameter slot
            this.setupParamSlotDropZone(paramSlot, blockId);
            
            paramsContainer.appendChild(paramSlot);
            contentWrapper.appendChild(paramsContainer);
            
        } else if (data.type === 'number' || data.type === 'text') {
            const label = document.createElement('span');
            label.className = 'block-label';
            label.textContent = data.type === 'number' ? '🔢' : '📝';
            contentWrapper.appendChild(label);
            
            const input = document.createElement('input');
            input.type = data.type === 'number' ? 'number' : 'text';
            input.className = 'block-input';
            input.placeholder = data.type === 'number' ? '123' : 'text';
            input.value = data.inputValue || '';
            input.addEventListener('input', () => this.generateSQL());
            input.addEventListener('click', (e) => e.stopPropagation());
            contentWrapper.appendChild(input);
        } else {
            const label = document.createElement('span');
            label.className = 'block-label';
            label.textContent = this.friendlyLabels[data.type] || data.type;
            contentWrapper.appendChild(label);
            
            const sqlLabel = document.createElement('span');
            sqlLabel.className = 'block-sql';
            sqlLabel.textContent = data.type;
            contentWrapper.appendChild(sqlLabel);
        }
        
        blockEl.appendChild(contentWrapper);
        
        // Add remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-block';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove this block and all blocks after it';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeBlockAndAfter(blockId);
        });
        blockEl.appendChild(removeBtn);
        
        // Add right connector placeholder
        const rightConnector = document.createElement('div');
        rightConnector.className = 'right-connector';
        blockEl.appendChild(rightConnector);
        
        this.canvas.appendChild(blockEl);
        
        // Update previous block to show right connector
        if (this.blocks.length > 0) {
            const prevBlock = this.blocks[this.blocks.length - 1].element;
            prevBlock.classList.add('has-right-connector');
        }
        
        this.blocks.push({
            id: blockId,
            type: data.type,
            class: data.class,
            element: blockEl,
            params: [] // Track parameters for functions
        });
        
        // Animate the connection
        blockEl.classList.add('block-snap');
        setTimeout(() => blockEl.classList.remove('block-snap'), 300);
        
        this.generateSQL();
        this.updateAvailableBlocks();
    }
    
    // Setup drag-and-drop for function parameter slots
    setupParamSlotDropZone(slotEl, parentBlockId) {
        slotEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const data = e.dataTransfer.getData('text/plain');
            if (data) {
                try {
                    const blockData = JSON.parse(data);
                    const isColumn = this.blockCategories[blockData.type] === 'COLUMN';
                    
                    if (isColumn && slotEl.classList.contains('empty')) {
                        slotEl.classList.add('drag-over');
                    }
                } catch (err) {}
            }
        });
        
        slotEl.addEventListener('dragleave', (e) => {
            if (!slotEl.contains(e.relatedTarget)) {
                slotEl.classList.remove('drag-over');
            }
        });
        
        slotEl.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            slotEl.classList.remove('drag-over');
            
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                const isColumn = this.blockCategories[data.type] === 'COLUMN';
                
                if (isColumn && slotEl.classList.contains('empty')) {
                    this.addParameterToSlot(slotEl, data, parentBlockId);
                }
            } catch (err) {
                console.error('Param drop error:', err);
            }
        });
    }
    
    // Add a column parameter to a function slot
    addParameterToSlot(slotEl, data, parentBlockId) {
        // Remove placeholder
        const placeholder = slotEl.querySelector('.slot-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        slotEl.classList.remove('empty');
        slotEl.classList.add('filled');
        
        // Create parameter block element
        const paramBlock = document.createElement('div');
        paramBlock.className = 'param-block';
        paramBlock.dataset.type = data.type;
        
        const paramLabel = document.createElement('span');
        paramLabel.className = 'param-label';
        paramLabel.textContent = data.type;
        paramBlock.appendChild(paramLabel);
        
        // Mini remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-param';
        removeBtn.innerHTML = '×';
        removeBtn.title = 'Remove this parameter';
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeParameter(slotEl, parentBlockId);
        });
        paramBlock.appendChild(removeBtn);
        
        slotEl.appendChild(paramBlock);
        
        // Update parent block's params array
        const parentBlock = this.blocks.find(b => b.id === parentBlockId);
        if (parentBlock) {
            parentBlock.params = [data.type];
        }
        
        // Remove highlight from function
        slotEl.closest('.canvas-block')?.classList.remove('accepting-drop');
        
        this.generateSQL();
    }
    
    // Remove parameter from function slot
    removeParameter(slotEl, parentBlockId) {
        // Remove parameter block
        const paramBlock = slotEl.querySelector('.param-block');
        if (paramBlock) {
            paramBlock.remove();
        }
        
        // Reset slot state
        slotEl.classList.add('empty');
        slotEl.classList.remove('filled');
        
        // Restore placeholder
        const placeholder = document.createElement('span');
        placeholder.className = 'slot-placeholder';
        placeholder.textContent = 'column';
        slotEl.appendChild(placeholder);
        
        // Update parent block's params
        const parentBlock = this.blocks.find(b => b.id === parentBlockId);
        if (parentBlock) {
            parentBlock.params = [];
        }
        
        this.generateSQL();
    }
    
    removeBlockAndAfter(blockId) {
        const index = this.blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;
        
        const blocksToRemove = this.blocks.slice(index);
        blocksToRemove.forEach(block => block.element.remove());
        
        this.blocks = this.blocks.slice(0, index);
        
        if (this.blocks.length > 0) {
            const lastBlock = this.blocks[this.blocks.length - 1].element;
            lastBlock.classList.remove('has-right-connector');
        }
        
        if (this.blocks.length === 0) {
            const placeholder = this.canvas.querySelector('.canvas-placeholder');
            if (placeholder) {
                placeholder.style.display = 'block';
            }
        }
        
        this.generateSQL();
        this.updateAvailableBlocks();
    }
    
    updateAvailableBlocks() {
        const lastCategory = this.getLastBlockCategory();
        const validNext = this.validConnections[lastCategory] || [];
        
        const menuBlocks = document.querySelectorAll('.block-menu .block');
        menuBlocks.forEach(block => {
            const type = block.dataset.type;
            const category = this.blockCategories[type] || 'UNKNOWN';
            
            const isValid = validNext.includes(category) || validNext.includes(type);
            
            block.classList.toggle('block--disabled', !isValid);
            block.classList.toggle('block--available', isValid);
            block.draggable = isValid;
            
            // Add hint for columns that can be dropped into functions
            const hasEmptyFunctionSlot = this.canvas.querySelector('.param-slot.empty') !== null;
            if (category === 'COLUMN' && hasEmptyFunctionSlot) {
                block.classList.add('can-drop-in-function');
            } else {
                block.classList.remove('can-drop-in-function');
            }
        });
    }
    
    generateSQL() {
        if (this.blocks.length === 0) {
            this.output.textContent = '-- Your query will appear here';
            return;
        }
        
        const parts = [];
        
        this.blocks.forEach((block, index) => {
            const el = block.element;
            const type = block.type;
            const prevBlock = this.blocks[index - 1];
            const currentCategory = this.blockCategories[type];
            
            // Check if we need to auto-insert comma between columns/functions
            const needsAutoComma = index > 0 && 
                              (currentCategory === 'COLUMN' || currentCategory === 'FUNCTION') &&
                              prevBlock && 
                              (this.blockCategories[prevBlock.type] === 'COLUMN' || 
                               this.blockCategories[prevBlock.type] === 'FUNCTION') &&
                              prevBlock.type !== ',';
            
            if (needsAutoComma) {
                parts.push({ type: 'COMMA', value: ',' });
            }
            
            // Process the current block
            if (type === 'number') {
                const input = el.querySelector('.block-input');
                const value = input ? input.value : '';
                parts.push(value || '?');
            } else if (type === 'text') {
                const input = el.querySelector('.block-input');
                const value = input ? input.value : '';
                if (value) {
                    if (!value.startsWith("'") && !value.startsWith('"')) {
                        parts.push(`'${value}'`);
                    } else {
                        parts.push(value);
                    }
                } else {
                    parts.push("'?'");
                }
            } else if (type === ',') {
                parts.push({ type: 'COMMA', value: ',' });
            } else if (currentCategory === 'FUNCTION') {
                // Handle function with explicit parameters from slot
                const functionName = type.replace('()', '');
                const params = block.params || [];
                
                if (params.length > 0) {
                    parts.push(`${functionName}(${params.join(', ')})`);
                } else {
                    // Empty function - show with empty parens
                    parts.push(`${functionName}()`);
                }
            } else {
                parts.push(type);
            }
        });
        
        let sql = this.formatSQL(parts);
        this.output.textContent = sql;
        
        this.validateQuery(sql);
    }
    
    formatSQL(parts) {
        let sql = '';
        const newLineKeywords = ['FROM', 'WHERE', 'JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'LIMIT', 'AND', 'OR'];
        
        parts.forEach((part, index) => {
            const prevPart = parts[index - 1];
            
            // Handle comma objects
            if (typeof part === 'object' && part.type === 'COMMA') {
                sql += part.value; // Add comma without space before it
                return;
            }
            
            const needsNewLine = newLineKeywords.includes(part);
            const needsSpace = index > 0 && 
                              !['(', ')'].includes(part) && 
                              !['('].includes(prevPart) &&
                              !(typeof prevPart === 'object' && prevPart.type === 'COMMA'); // No space after comma is already handled
            
            // Check if previous part was a comma - we need a space after it
            const prevWasComma = typeof prevPart === 'object' && prevPart.type === 'COMMA';
            
            if (needsNewLine && index > 0) {
                sql += '\n' + part;
            } else if (prevWasComma) {
                sql += ' ' + part; // Always add space after comma
            } else if (needsSpace) {
                sql += ' ' + part;
            } else {
                sql += part;
            }
        });
        
        return sql || '-- Your query will appear here';
    }
    
    validateQuery(sql) {
        const isComplete = this.isQueryComplete();
        const outputContainer = this.output.parentElement;
        
        outputContainer.classList.remove('sql-valid', 'sql-incomplete');
        outputContainer.classList.add(isComplete ? 'sql-valid' : 'sql-incomplete');
        
        const runBtn = document.getElementById('run-builder-btn');
        if (runBtn) {
            runBtn.disabled = !isComplete;
            runBtn.classList.toggle('btn--disabled', !isComplete);
        }
    }
    
    isQueryComplete() {
        if (this.blocks.length === 0) return false;
        
        const hasSelect = this.blocks.some(b => b.type === 'SELECT');
        const hasFrom = this.blocks.some(b => b.type === 'FROM');
        const hasTable = this.blocks.some(b => this.blockCategories[b.type] === 'TABLE');
        const hasColumn = this.blocks.some(b => 
            this.blockCategories[b.type] === 'COLUMN' || 
            this.blockCategories[b.type] === 'FUNCTION'
        );
        
        return hasSelect && hasFrom && hasTable && hasColumn;
    }
    
    setupClearButton() {
        const clearBtn = document.getElementById('clear-builder-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearCanvas());
        }
    }
    
    clearCanvas() {
        const canvasBlocks = this.canvas.querySelectorAll('.canvas-block');
        canvasBlocks.forEach(block => block.remove());
        
        this.blocks = [];
        this.blockIdCounter = 0;
        
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
        
        this.output.textContent = '-- Your query will appear here';
        this.updateAvailableBlocks();
        
        const outputContainer = this.output.parentElement;
        outputContainer.classList.remove('sql-valid', 'sql-incomplete');
    }
    
    setupRunButton() {
        const runBtn = document.getElementById('run-builder-btn');
        if (runBtn) {
            runBtn.addEventListener('click', () => this.runQuery());
        }
    }
    
    async runQuery() {
        const sql = this.output.textContent;
        
        if (sql === '-- Your query will appear here' || !sql.trim()) {
            this.showMessage('Please build a query first', 'error');
            return;
        }
        
        if (!this.isQueryComplete()) {
            this.showMessage('Please complete your query (need SELECT, columns, FROM, and a table)', 'error');
            return;
        }
        
        try {
            const response = await fetch('http://localhost:8000/api/execute/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
        
        // Render as table
        resultsContainer.innerHTML = `
            <div class="results-table-wrapper">
                <table class="results-table">
                    <thead>
                        <tr>
                            ${data.columns.map(col => `<th>${col}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${data.rows.map(row => `
                            <tr>
                                ${row.map(cell => `<td>${cell !== null ? cell : '<span class="null-value">NULL</span>'}</td>`).join('')}
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