/**
 * Beginner-friendly tooltips for SQL blocks
 */
export const blockTooltips = {
    // Commands
    'SELECT': '📋 Choose which columns (data) you want to see from a table',
    'FROM': '📁 Pick which table to get your data from',
    'WHERE': '🔍 Filter rows - only show data that matches your condition',
    'JOIN': '🔗 Combine data from two tables together',
    'ON': '🎯 Specify how to match rows when joining tables',
    'GROUP BY': '📦 Group similar rows together (used with COUNT, SUM, etc.)',
    'ORDER BY': '📊 Sort your results (A-Z, smallest to largest, etc.)',
    'LIMIT': '✂️ Show only a certain number of results',

    // Comparisons
    '=': '✓ Equals - find exact matches',
    '!=': '✗ Not equals - find everything except this value',
    '>': '📈 Greater than - find values larger than this',
    '<': '📉 Less than - find values smaller than this',
    '>=': '📈 Greater than or equal to',
    '<=': '📉 Less than or equal to',
    'LIKE': '🔎 Pattern matching - use % as a wildcard (e.g., "John%")',
    'IN': '📋 Match any value in a list (e.g., IN "A", "B", "C")',

    // Logic
    'AND': '➕ Both conditions must be true',
    'OR': '🔀 At least one condition must be true',

    // Functions
    'COUNT()': '🔢 Count how many rows/items there are',
    'SUM()': '➕ Add up all the numbers in a column',
    'AVG()': '📊 Calculate the average (mean) of numbers',
    'MIN()': '⬇️ Find the smallest value',
    'MAX()': '⬆️ Find the largest value',
    'DISTINCT': '🎯 Remove duplicates - show unique values only',

    // Tables
    'employees': '👥 Table with employee info (name, salary, department, etc.)',
    'departments': '🏢 Table with department info (name, location, etc.)',

    // Columns
    '*': '✨ Select ALL columns from the table',
    'id': '🔑 Unique identifier for each row',
    'name': '👤 Person\'s or department\'s name',
    'department': '🏷️ Which department someone belongs to',
    'salary': '💰 How much money someone earns',
    'hire_date': '📅 When someone was hired',
    'location': '📍 Where something is located',

    // Values & Sorting
    'ASC': '⬆️ Sort ascending (A→Z, 1→9, oldest→newest)',
    'DESC': '⬇️ Sort descending (Z→A, 9→1, newest→oldest)',
    'number': '🔢 Type a number value here',
    'text': '📝 Type a text value here (for names, etc.)'
};

/**
 * Get tooltip text for a block type
 * @param {string} blockType - The data-type of the block
 * @returns {string} The tooltip text
 */
export function getTooltip(blockType) {
    return blockTooltips[blockType] || 'SQL block';
}