import { extractDragData, parseDragData, isColumn } from './utils.js';

/**
 * Manages drag and drop functionality for the block builder
 */
export class DragDropManager {
    /**
     * @param {SQLBlockBuilder} builder - Reference to main builder instance
     */
    constructor(builder) {
        this.builder = builder;
        this.canvas = builder.canvas;
    }
    
    /**
     * Initialize drag and drop event listeners
     */
    init() {
        this.setupMenuBlockDragging();
        this.setupCanvasDropZone();
    }
    
    /**
     * Setup dragging for menu blocks
     */
    setupMenuBlockDragging() {
        const menuBlocks = document.querySelectorAll('.block-menu .block');
        menuBlocks.forEach(block => {
            block.addEventListener('dragstart', (e) => this.handleDragStart(e));
            block.addEventListener('dragend', (e) => this.handleDragEnd(e));
        });
    }
    
    /**
     * Setup canvas as drop zone
     */
    setupCanvasDropZone() {
        this.canvas.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.canvas.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.canvas.addEventListener('drop', (e) => this.handleDrop(e));
    }
    
    /**
     * Handle drag start event
     * @param {DragEvent} event
     */
    handleDragStart(event) {
        const block = event.target.closest('.block');
        
        if (block.classList.contains('block--disabled')) {
            event.preventDefault();
            return;
        }
        
        const dragData = extractDragData(block);
        event.dataTransfer.setData('text/plain', JSON.stringify(dragData));
        event.dataTransfer.effectAllowed = 'copy';
        block.classList.add('dragging');
        
        // Highlight function slots when dragging a column
        if (isColumn(dragData.type)) {
            this.builder.highlightFunctionSlots(true);
        }
    }
    
    /**
     * Handle drag end event
     * @param {DragEvent} event
     */
    handleDragEnd(event) {
        event.target.classList.remove('dragging');
        this.builder.highlightFunctionSlots(false);
    }
    
    /**
     * Handle drag over canvas
     * @param {DragEvent} event
     */
    handleDragOver(event) {
        event.preventDefault();
        
        const blockData = parseDragData(event);
        this.updateCanvasDragState(blockData);
    }
    
    /**
     * Update canvas visual state during drag
     * @param {Object|null} blockData
     */
    updateCanvasDragState(blockData) {
        this.canvas.classList.remove('drag-over', 'drag-valid', 'drag-invalid');
        this.canvas.classList.add('drag-over');
        
        if (blockData) {
            const canConnect = this.builder.canConnect(blockData.type);
            this.canvas.classList.add(canConnect ? 'drag-valid' : 'drag-invalid');
        }
    }
    
    /**
     * Handle drag leave canvas
     * @param {DragEvent} event
     */
    handleDragLeave(event) {
        if (!this.canvas.contains(event.relatedTarget)) {
            this.clearCanvasDragState();
        }
    }
    
    /**
     * Clear canvas drag visual states
     */
    clearCanvasDragState() {
        this.canvas.classList.remove('drag-over', 'drag-valid', 'drag-invalid');
    }
    
    /**
     * Handle drop on canvas
     * @param {DragEvent} event
     */
    handleDrop(event) {
        event.preventDefault();
        this.clearCanvasDragState();
        
        const data = parseDragData(event);
        if (!data) return;
        
        if (this.builder.canConnect(data.type)) {
            this.builder.addBlockToCanvas(data);
        } else {
            this.builder.showConnectionError(data.type);
        }
    }
    
    /**
     * Setup drop zone for function parameter slots
     * @param {HTMLElement} slotEl - The parameter slot element
     * @param {number} parentBlockId - ID of the parent function block
     */
    setupParamSlotDropZone(slotEl, parentBlockId) {
        slotEl.addEventListener('dragover', (e) => {
            this.handleParamSlotDragOver(e, slotEl);
        });
        
        slotEl.addEventListener('dragleave', (e) => {
            this.handleParamSlotDragLeave(e, slotEl);
        });
        
        slotEl.addEventListener('drop', (e) => {
            this.handleParamSlotDrop(e, slotEl, parentBlockId);
        });
    }
    
    /**
     * Handle drag over parameter slot
     */
    handleParamSlotDragOver(event, slotEl) {
        event.preventDefault();
        event.stopPropagation();
        
        const blockData = parseDragData(event);
        if (!blockData) return;
        
        if (isColumn(blockData.type) && slotEl.classList.contains('empty')) {
            slotEl.classList.add('drag-over');
        }
    }
    
    /**
     * Handle drag leave parameter slot
     */
    handleParamSlotDragLeave(event, slotEl) {
        if (!slotEl.contains(event.relatedTarget)) {
            slotEl.classList.remove('drag-over');
        }
    }
    
    /**
     * Handle drop on parameter slot
     */
    handleParamSlotDrop(event, slotEl, parentBlockId) {
        event.preventDefault();
        event.stopPropagation();
        slotEl.classList.remove('drag-over');
        
        const data = parseDragData(event);
        if (!data) return;
        
        if (isColumn(data.type) && slotEl.classList.contains('empty')) {
            this.builder.addParameterToSlot(slotEl, data, parentBlockId);
        }
    }
}