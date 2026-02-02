import { BLOCK_CATEGORIES, FRIENDLY_LABELS } from './config.js';

/**
 * Gets the CSS class of a block element
 * @param {HTMLElement} block - The block element
 * @returns {string} The block class name
 */
export function getBlockClass(block) {
    const classMap = [
        'block--command',
        'block--operator',
        'block--function',
        'block--table',
        'block--column',
        'block--value'
    ];
    
    for (const className of classMap) {
        if (block.classList.contains(className)) {
            return className;
        }
    }
    return '';
}

/**
 * Gets the category for a block type
 * @param {string} blockType - The block type
 * @returns {string} The category or 'UNKNOWN'
 */
export function getBlockCategory(blockType) {
    return BLOCK_CATEGORIES[blockType] || 'UNKNOWN';
}

/**
 * Gets the friendly label for a block type
 * @param {string} blockType - The block type
 * @returns {string} The friendly label or the original type
 */
export function getFriendlyLabel(blockType) {
    return FRIENDLY_LABELS[blockType] || blockType;
}

/**
 * Creates a DOM element with attributes
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {string} textContent - Optional text content
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, textContent = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key.startsWith('data')) {
            const dataKey = key.replace('data', '').toLowerCase();
            element.dataset[dataKey] = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    if (textContent) {
        element.textContent = textContent;
    }
    
    return element;
}

/**
 * Extracts drag data from a block element
 * @param {HTMLElement} block - The block element
 * @returns {Object} Block data for drag transfer
 */
export function extractDragData(block) {
    const blockType = block.dataset.type;
    const blockClass = getBlockClass(block);
    const input = block.querySelector('.block-input');
    
    return {
        type: blockType,
        class: blockClass,
        inputValue: input ? input.value : '',
        isFromCanvas: block.classList.contains('canvas-block'),
        blockId: block.dataset.blockId || null
    };
}

/**
 * Parses drag event data safely
 * @param {DragEvent} event - The drag event
 * @returns {Object|null} Parsed data or null if invalid
 */
export function parseDragData(event) {
    try {
        const data = event.dataTransfer.getData('text/plain');
        return data ? JSON.parse(data) : null;
    } catch (err) {
        console.error('Failed to parse drag data:', err);
        return null;
    }
}

/**
 * Checks if a block type is a column
 * @param {string} blockType - The block type
 * @returns {boolean}
 */
export function isColumn(blockType) {
    return getBlockCategory(blockType) === 'COLUMN';
}

/**
 * Checks if a block type is a function
 * @param {string} blockType - The block type
 * @returns {boolean}
 */
export function isFunction(blockType) {
    return getBlockCategory(blockType) === 'FUNCTION';
}

/**
 * Checks if a block type is a value
 * @param {string} blockType - The block type
 * @returns {boolean}
 */
export function isValue(blockType) {
    return getBlockCategory(blockType) === 'VALUE';
}

/**
 * Extracts function name from function block type
 * @param {string} functionType - e.g., "SUM()"
 * @returns {string} e.g., "SUM"
 */
export function extractFunctionName(functionType) {
    return functionType.replace('()', '');
}