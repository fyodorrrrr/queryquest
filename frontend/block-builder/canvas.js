import { BLOCK_CATEGORIES, VALID_CONNECTIONS, SQL_KEYWORDS } from './config.js';
import { createElement, getFriendlyLabel, isFunction, extractFunctionName } from './utils.js';

/**
 * Manages canvas operations for the block builder
 */
export class CanvasManager {
    /**
     * @param {SQLBlockBuilder} builder - Reference to main builder instance
     */
    constructor(builder) {
        this.builder = builder;
        this.canvas = builder.canvas;
    }
    
    /**
     * Add a block to the canvas
     * @param {Object} data - Block data
     */
    addBlock(data) {
        this.hidePlaceholder();
        
        const blockId = this.builder.blockIdCounter++;
        const blockEl = this.createBlockElement(data, blockId);
        
        this.addConnectors(blockEl);
        this.canvas.appendChild(blockEl);
        this.updatePreviousBlockConnector();
        
        this.builder.blocks.push({
            id: blockId,
            type: data.type,
            class: data.class,
            element: blockEl,
            params: []
        });
        
        this.animateBlockSnap(blockEl);
        this.builder.generateSQL();
        this.builder.updateAvailableBlocks();
    }
    
    /**
     * Hide the canvas placeholder
     */
    hidePlaceholder() {
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.style.display = 'none';
        }
    }
    
    /**
     * Show the canvas placeholder
     */
    showPlaceholder() {
        const placeholder = this.canvas.querySelector('.canvas-placeholder');
        if (placeholder) {
            placeholder.style.display = 'block';
        }
    }
    
    /**
     * Create a block DOM element
     * @param {Object} data - Block data
     * @param {number} blockId - Unique block ID
     * @returns {HTMLElement}
     */
    createBlockElement(data, blockId) {
        const blockEl = createElement('div', {
            className: `canvas-block ${data.class} puzzle-block`,
            dataBlockid: blockId,
            dataType: data.type
        });
        
        const contentWrapper = this.createBlockContent(data, blockId);
        blockEl.appendChild(contentWrapper);
        
        const removeBtn = this.createRemoveButton(blockId);
        blockEl.appendChild(removeBtn);
        
        const rightConnector = createElement('div', { className: 'right-connector' });
        blockEl.appendChild(rightConnector);
        
        return blockEl;
    }
    
    /**
     * Create block content based on type
     * @param {Object} data - Block data
     * @param {number} blockId - Unique block ID
     * @returns {HTMLElement}
     */
    createBlockContent(data, blockId) {
        const contentWrapper = createElement('div', { className: 'block-content' });
        const category = BLOCK_CATEGORIES[data.type];
        
        if (isFunction(data.type)) {
            this.appendFunctionContent(contentWrapper, data, blockId);
        } else if (data.type === 'number' || data.type === 'text') {
            this.appendInputContent(contentWrapper, data);
        } else {
            this.appendLabelContent(contentWrapper, data);
        }
        
        return contentWrapper;
    }
    
    /**
     * Append function block content with parameter slot
     */
    appendFunctionContent(wrapper, data, blockId) {
        const functionName = extractFunctionName(data.type);
        
        const label = createElement('span', { className: 'block-label' }, getFriendlyLabel(data.type));
        wrapper.appendChild(label);
        
        const sqlLabel = createElement('span', { className: 'block-sql' }, functionName);
        wrapper.appendChild(sqlLabel);
        
        const paramsContainer = createElement('span', { className: 'function-params' });
        const paramSlot = this.createParameterSlot(blockId, 0);
        paramsContainer.appendChild(paramSlot);
        wrapper.appendChild(paramsContainer);
    }
    
    /**
     * Append input block content
     */
    appendInputContent(wrapper, data) {
        const label = createElement('span', { className: 'block-label' }, 
            data.type === 'number' ? '🔢' : '📝');
        wrapper.appendChild(label);
        
        const input = createElement('input', {
            type: data.type === 'number' ? 'number' : 'text',
            className: 'block-input',
            placeholder: data.type === 'number' ? '123' : 'text'
        });
        input.value = data.inputValue || '';
        input.addEventListener('input', () => this.builder.generateSQL());
        input.addEventListener('click', (e) => e.stopPropagation());
        wrapper.appendChild(input);
    }
    
    /**
     * Append standard label content
     */
    appendLabelContent(wrapper, data) {
        const label = createElement('span', { className: 'block-label' }, getFriendlyLabel(data.type));
        wrapper.appendChild(label);
        
        const sqlLabel = createElement('span', { className: 'block-sql' }, data.type);
        wrapper.appendChild(sqlLabel);
    }
    
    /**
     * Create a parameter slot for function blocks
     * @param {number} blockId - Parent block ID
     * @param {number} paramIndex - Parameter index
     * @returns {HTMLElement}
     */
    createParameterSlot(blockId, paramIndex) {
        const paramSlot = createElement('div', {
            className: 'param-slot empty',
            dataParamindex: paramIndex
        });
        
        const placeholder = createElement('span', { className: 'slot-placeholder' }, 'column');
        paramSlot.appendChild(placeholder);
        
        this.builder.dragDropManager.setupParamSlotDropZone(paramSlot, blockId);
        
        return paramSlot;
    }
    
    /**
     * Create remove button for a block
     * @param {number} blockId
     * @returns {HTMLElement}
     */
    createRemoveButton(blockId) {
        const removeBtn = createElement('button', {
            className: 'remove-block',
            title: 'Remove this block and all blocks after it'
        }, '×');
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeBlockAndAfter(blockId);
        });
        
        return removeBtn;
    }
    
    /**
     * Add connectors to block element
     * @param {HTMLElement} blockEl
     */
    addConnectors(blockEl) {
        if (this.builder.blocks.length > 0) {
            blockEl.classList.add('has-left-connector');
        }
    }
    
    /**
     * Update previous block's right connector
     */
    updatePreviousBlockConnector() {
        if (this.builder.blocks.length > 0) {
            const prevBlock = this.builder.blocks[this.builder.blocks.length - 1].element;
            prevBlock.classList.add('has-right-connector');
        }
    }
    
    /**
     * Animate block snap effect
     * @param {HTMLElement} blockEl
     */
    animateBlockSnap(blockEl) {
        blockEl.classList.add('block-snap');
        setTimeout(() => blockEl.classList.remove('block-snap'), 300);
    }
    
    /**
     * Remove a block and all blocks after it
     * @param {number} blockId
     */
    removeBlockAndAfter(blockId) {
        const index = this.builder.blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;
        
        const blocksToRemove = this.builder.blocks.slice(index);
        blocksToRemove.forEach(block => block.element.remove());
        
        this.builder.blocks = this.builder.blocks.slice(0, index);
        
        if (this.builder.blocks.length > 0) {
            const lastBlock = this.builder.blocks[this.builder.blocks.length - 1].element;
            lastBlock.classList.remove('has-right-connector');
        }
        
        if (this.builder.blocks.length === 0) {
            this.showPlaceholder();
        }
        
        this.builder.generateSQL();
        this.builder.updateAvailableBlocks();
    }
    
    /**
     * Clear all blocks from canvas
     */
    clear() {
        const canvasBlocks = this.canvas.querySelectorAll('.canvas-block');
        canvasBlocks.forEach(block => block.remove());
        
        this.builder.blocks = [];
        this.builder.blockIdCounter = 0;
        
        this.showPlaceholder();
        this.builder.output.textContent = '-- Your query will appear here';
        this.builder.updateAvailableBlocks();
        
        const outputContainer = this.builder.output.parentElement;
        outputContainer.classList.remove('sql-valid', 'sql-incomplete');
    }
    
    /**
     * Add parameter to function slot
     * @param {HTMLElement} slotEl
     * @param {Object} data
     * @param {number} parentBlockId
     */
    addParameterToSlot(slotEl, data, parentBlockId) {
        const placeholder = slotEl.querySelector('.slot-placeholder');
        if (placeholder) {
            placeholder.remove();
        }
        
        slotEl.classList.remove('empty');
        slotEl.classList.add('filled');
        
        const paramBlock = this.createParameterBlock(data, slotEl, parentBlockId);
        slotEl.appendChild(paramBlock);
        
        const parentBlock = this.builder.blocks.find(b => b.id === parentBlockId);
        if (parentBlock) {
            parentBlock.params = [data.type];
        }
        
        slotEl.closest('.canvas-block')?.classList.remove('accepting-drop');
        this.builder.generateSQL();
    }
    
    /**
     * Create a parameter block element
     */
    createParameterBlock(data, slotEl, parentBlockId) {
        const paramBlock = createElement('div', {
            className: 'param-block',
            dataType: data.type
        });
        
        const paramLabel = createElement('span', { className: 'param-label' }, data.type);
        paramBlock.appendChild(paramLabel);
        
        const removeBtn = createElement('button', {
            className: 'remove-param',
            title: 'Remove this parameter'
        }, '×');
        
        removeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeParameter(slotEl, parentBlockId);
        });
        paramBlock.appendChild(removeBtn);
        
        return paramBlock;
    }
    
    /**
     * Remove parameter from function slot
     */
    removeParameter(slotEl, parentBlockId) {
        const paramBlock = slotEl.querySelector('.param-block');
        if (paramBlock) {
            paramBlock.remove();
        }
        
        slotEl.classList.add('empty');
        slotEl.classList.remove('filled');
        
        const placeholder = createElement('span', { className: 'slot-placeholder' }, 'column');
        slotEl.appendChild(placeholder);
        
        const parentBlock = this.builder.blocks.find(b => b.id === parentBlockId);
        if (parentBlock) {
            parentBlock.params = [];
        }
        
        this.builder.generateSQL();
    }
    
    /**
     * Highlight function slots for dropping
     * @param {boolean} show
     */
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
}