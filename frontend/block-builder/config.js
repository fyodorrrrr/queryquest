/**
 * Valid connections between block categories
 * Defines what block types can follow other block types
 */
export const VALID_CONNECTIONS = {
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

/**
 * Maps block types to their categories for connection logic
 */
export const BLOCK_CATEGORIES = {
    // Keywords
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
    
    // Operators
    '=': 'OPERATOR',
    '!=': 'OPERATOR',
    '>': 'OPERATOR',
    '<': 'OPERATOR',
    '>=': 'OPERATOR',
    '<=': 'OPERATOR',
    'LIKE': 'OPERATOR',
    'IN': 'OPERATOR',
    
    // Functions
    'COUNT()': 'FUNCTION',
    'SUM()': 'FUNCTION',
    'AVG()': 'FUNCTION',
    'MIN()': 'FUNCTION',
    'MAX()': 'FUNCTION',
    
    // Tables
    'employees': 'TABLE',
    'departments': 'TABLE',
    
    // Columns
    '*': 'COLUMN',
    'id': 'COLUMN',
    'name': 'COLUMN',
    'department': 'COLUMN',
    'salary': 'COLUMN',
    'hire_date': 'COLUMN',
    'location': 'COLUMN',
    
    // Values
    'number': 'VALUE',
    'text': 'VALUE'
};

/**
 * User-friendly labels for blocks (no emojis)
 */
export const FRIENDLY_LABELS = {
    // Keywords
    'SELECT': 'Select',
    'DISTINCT': 'Unique',
    'FROM': 'From Table',
    'WHERE': 'Filter',
    'JOIN': 'Join',
    'ON': 'Match On',
    'GROUP BY': 'Group By',
    'ORDER BY': 'Sort By',
    'LIMIT': 'Limit',
    'AND': 'And',
    'OR': 'Or',
    
    // Operators
    '=': 'equals',
    '!=': 'not equals',
    '>': 'greater than',
    '<': 'less than',
    '>=': 'at least',
    '<=': 'at most',
    'LIKE': 'matches',
    'IN': 'in list',
    
    // Functions
    'COUNT()': 'Count',
    'SUM()': 'Sum',
    'AVG()': 'Average',
    'MIN()': 'Minimum',
    'MAX()': 'Maximum',
    
    // Sort directions
    'ASC': 'Ascending',
    'DESC': 'Descending',
    
    // Tables
    'employees': 'employees',
    'departments': 'departments',
    
    // Columns
    '*': 'All Columns',
    'id': 'id',
    'name': 'name',
    'department': 'department',
    'salary': 'salary',
    'hire_date': 'hire_date',
    'location': 'location'
};

/**
 * Keywords that trigger a new line in SQL output
 */
export const NEW_LINE_KEYWORDS = [
    'FROM', 'WHERE', 'JOIN', 'ON', 
    'GROUP BY', 'ORDER BY', 'LIMIT', 
    'AND', 'OR'
];

/**
 * SQL keywords used for context detection
 */
export const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'JOIN', 'ON',
    'GROUP BY', 'ORDER BY', 'LIMIT', 'AND', 'OR'
];

/**
 * API configuration
 */
export const API_CONFIG = {
    baseUrl: 'http://localhost:8000',
    endpoints: {
        execute: '/api/execute/'
    }
};