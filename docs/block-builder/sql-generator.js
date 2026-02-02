import { BLOCK_CATEGORIES, NEW_LINE_KEYWORDS, SQL_KEYWORDS, VALID_CONNECTIONS } from './config.js';
import { isFunction, isColumn, extractFunctionName, getBlockCategory } from './utils.js';

/**
 * Handles SQL generation from blocks
 */
export class SQLGenerator {
    /**
     * @param {SQLBlockBuilder} builder - Reference to main builder instance
     */
    constructor(builder) {
        this.builder = builder;
    }
    
    /**
     * Generate SQL from current blocks
     * @returns {string} Generated SQL
     */
    generate() {
        const blocks = this.builder.blocks;
        
        if (blocks.length === 0) {
            return '-- Your query will appear here';
        }
        
        const parts = this.collectParts(blocks);
        return this.formatSQL(parts);
    }
    
    /**
     * Collect SQL parts from blocks
     * @param {Array} blocks
     * @returns {Array} SQL parts
     */
    collectParts(blocks) {
        const parts = [];
        
        blocks.forEach((block, index) => {
            const prevBlock = blocks[index - 1];
            
            // Auto-insert comma between columns/functions
            if (this.needsAutoComma(block, prevBlock)) {
                parts.push({ type: 'COMMA', value: ',' });
            }
            
            // Process the block
            const part = this.processBlock(block);
            if (part !== null) {
                parts.push(part);
            }
        });
        
        return parts;
    }
    
    /**
     * Check if auto-comma is needed before current block
     * @param {Object} block - Current block
     * @param {Object} prevBlock - Previous block
     * @returns {boolean}
     */
    needsAutoComma(block, prevBlock) {
        if (!prevBlock) return false;
        
        const currentCategory = getBlockCategory(block.type);
        const prevCategory = getBlockCategory(prevBlock.type);
        
        const isCurrentColumnOrFunction = currentCategory === 'COLUMN' || currentCategory === 'FUNCTION';
        const isPrevColumnOrFunction = prevCategory === 'COLUMN' || prevCategory === 'FUNCTION';
        const prevIsNotComma = prevBlock.type !== ',';
        
        return isCurrentColumnOrFunction && isPrevColumnOrFunction && prevIsNotComma;
    }
    
    /**
     * Process a single block into SQL part
     * @param {Object} block
     * @returns {string|Object|null}
     */
    processBlock(block) {
        const { type, element, params } = block;
        
        if (type === 'number') {
            return this.processNumberBlock(element);
        }
        
        if (type === 'text') {
            return this.processTextBlock(element);
        }
        
        if (type === ',') {
            return { type: 'COMMA', value: ',' };
        }
        
        if (isFunction(type)) {
            return this.processFunctionBlock(type, params);
        }
        
        return type;
    }
    
    /**
     * Process number input block
     * @param {HTMLElement} element
     * @returns {string}
     */
    processNumberBlock(element) {
        const input = element.querySelector('.block-input');
        const value = input ? input.value : '';
        return value || '?';
    }
    
    /**
     * Process text input block
     * @param {HTMLElement} element
     * @returns {string}
     */
    processTextBlock(element) {
        const input = element.querySelector('.block-input');
        const value = input ? input.value : '';
        
        if (!value) return "'?'";
        
        // Add quotes if not already quoted
        if (!value.startsWith("'") && !value.startsWith('"')) {
            return `'${value}'`;
        }
        return value;
    }
    
    /**
     * Process function block with parameters
     * @param {string} type - Function type
     * @param {Array} params - Function parameters
     * @returns {string}
     */
    processFunctionBlock(type, params) {
        const functionName = extractFunctionName(type);
        
        if (params && params.length > 0) {
            return `${functionName}(${params.join(', ')})`;
        }
        return `${functionName}()`;
    }
    
    /**
     * Format SQL parts into final string
     * @param {Array} parts
     * @returns {string}
     */
    formatSQL(parts) {
        let sql = '';
        
        parts.forEach((part, index) => {
            const prevPart = parts[index - 1];
            sql += this.formatPart(part, prevPart, index);
        });
        
        return sql || '-- Your query will appear here';
    }
    
    /**
     * Format a single SQL part
     * @param {string|Object} part
     * @param {string|Object} prevPart
     * @param {number} index
     * @returns {string}
     */
    formatPart(part, prevPart, index) {
        // Handle comma objects
        if (typeof part === 'object' && part.type === 'COMMA') {
            return part.value;
        }
        
        const needsNewLine = NEW_LINE_KEYWORDS.includes(part);
        const prevWasComma = typeof prevPart === 'object' && prevPart.type === 'COMMA';
        
        const needsSpace = index > 0 && 
                          !['(', ')'].includes(part) && 
                          !['('].includes(prevPart) &&
                          !prevWasComma;
        
        if (needsNewLine && index > 0) {
            return '\n' + part;
        }
        
        if (prevWasComma) {
            return ' ' + part;
        }
        
        if (needsSpace) {
            return ' ' + part;
        }
        
        return part;
    }
    
    /**
     * Check if query is complete (runnable)
     * @returns {boolean}
     */
    isQueryComplete() {
        const blocks = this.builder.blocks;
        
        if (blocks.length === 0) return false;
        
        const hasSelect = blocks.some(b => b.type === 'SELECT');
        const hasFrom = blocks.some(b => b.type === 'FROM');
        const hasTable = blocks.some(b => getBlockCategory(b.type) === 'TABLE');
        const hasColumn = blocks.some(b => 
            getBlockCategory(b.type) === 'COLUMN' || 
            getBlockCategory(b.type) === 'FUNCTION'
        );
        
        return hasSelect && hasFrom && hasTable && hasColumn;
    }
    
    /**
     * Get the category of the last block (context-aware)
     * @returns {string}
     */
    getLastBlockCategory() {
        const blocks = this.builder.blocks;
        
        if (blocks.length === 0) return 'START';
        
        const lastBlock = blocks[blocks.length - 1];
        const type = lastBlock.type;
        const category = getBlockCategory(type);
        
        if (category === 'COLUMN') {
            const prevBlocks = blocks.slice(0, -1);
            const lastKeyword = this.findLastKeyword(prevBlocks);
            
            if (['WHERE', 'AND', 'OR'].includes(lastKeyword)) {
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
    
    /**
     * Find the last SQL keyword in blocks
     * @param {Array} blocks
     * @returns {string|null}
     */
    findLastKeyword(blocks) {
        for (let i = blocks.length - 1; i >= 0; i--) {
            if (SQL_KEYWORDS.includes(blocks[i].type)) {
                return blocks[i].type;
            }
        }
        return null;
    }
    
    /**
     * Check if a new block type can connect
     * @param {string} newBlockType
     * @returns {boolean}
     */
    canConnect(newBlockType) {
        const lastCategory = this.getLastBlockCategory();
        const newCategory = getBlockCategory(newBlockType);
        
        const validNext = VALID_CONNECTIONS[lastCategory] || [];
        
        if (validNext.includes(newCategory) || validNext.includes(newBlockType)) {
            return true;
        }
        
        // Special comma handling
        if (newBlockType === ',' || newCategory === 'COMMA') {
            return ['COLUMN', 'FUNCTION', 'GROUP_COLUMN', 'ORDER_COLUMN'].includes(lastCategory);
        }
        
        return false;
    }
}