from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
import json
import sqlite3

@csrf_exempt
@require_http_methods(["POST"])
def execute_query(request):
    try:
        data = json.loads(request.body)
        query = data.get('query', '').strip()
        
        if not query:
            return JsonResponse({
                'success': False,
                'error': 'Query cannot be empty'
            })
        
        # Security: Block dangerous operations
        forbidden_keywords = ['DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'CREATE', 'TRUNCATE']
        query_upper = query.upper()
        for keyword in forbidden_keywords:
            if keyword in query_upper:
                return JsonResponse({
                    'success': False,
                    'error': f'{keyword} operations are not allowed in this playground'
                })
        
        # Create in-memory database with sample data
        conn = sqlite3.connect(':memory:')
        cursor = conn.cursor()
        
        # Create sample tables
        cursor.execute('''
            CREATE TABLE employees (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                department TEXT,
                salary INTEGER,
                hire_date TEXT
            )
        ''')
        
        cursor.execute('''
            CREATE TABLE departments (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                location TEXT
            )
        ''')
        
        # Insert sample data
        employees_data = [
            (1, 'John Doe', 'Engineering', 75000, '2020-01-15'),
            (2, 'Jane Smith', 'Marketing', 65000, '2019-03-22'),
            (3, 'Bob Johnson', 'Engineering', 80000, '2018-07-10'),
            (4, 'Alice Brown', 'HR', 60000, '2021-05-03'),
            (5, 'Charlie Wilson', 'Sales', 70000, '2020-11-20'),
        ]
        cursor.executemany('INSERT INTO employees VALUES (?, ?, ?, ?, ?)', employees_data)
        
        departments_data = [
            (1, 'Engineering', 'Building A'),
            (2, 'Marketing', 'Building B'),
            (3, 'HR', 'Building C'),
            (4, 'Sales', 'Building B'),
        ]
        cursor.executemany('INSERT INTO departments VALUES (?, ?, ?)', departments_data)
        
        # Execute user query with timeout
        cursor.execute(query)
        
        # Get results
        columns = [desc[0] for desc in cursor.description] if cursor.description else []
        rows = cursor.fetchall()
        
        conn.close()
        
        return JsonResponse({
            'success': True,
            'columns': columns,
            'rows': rows,
            'row_count': len(rows)
        })
        
    except sqlite3.Error as e:
        return JsonResponse({
            'success': False,
            'error': f'SQL Error: {str(e)}'
        })
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': 'An unexpected error occurred'
        })

def get_schema(request):
    """Return database schema information"""
    schema = {
        'tables': [
            {
                'name': 'employees',
                'columns': [
                    {'name': 'id', 'type': 'INTEGER', 'constraint': 'PRIMARY KEY'},
                    {'name': 'name', 'type': 'TEXT', 'constraint': 'NOT NULL'},
                    {'name': 'department', 'type': 'TEXT', 'constraint': ''},
                    {'name': 'salary', 'type': 'INTEGER', 'constraint': ''},
                    {'name': 'hire_date', 'type': 'TEXT', 'constraint': ''},
                ]
            },
            {
                'name': 'departments',
                'columns': [
                    {'name': 'id', 'type': 'INTEGER', 'constraint': 'PRIMARY KEY'},
                    {'name': 'name', 'type': 'TEXT', 'constraint': 'NOT NULL'},
                    {'name': 'location', 'type': 'TEXT', 'constraint': ''},
                ]
            }
        ]
    }
    return JsonResponse(schema)
