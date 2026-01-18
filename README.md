# QueryQuest - SQL Learning Playground

An interactive SQL learning platform where you can practice SQL queries in a safe sandbox environment.

## Setup

### Backend

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd queryquest/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**
   ```bash
   # Copy the example env file
   cp .env.example .env
   
   # Generate a new secret key
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   
   # Add the generated key to .env file
   ```

5. **Run migrations**
   ```bash
   python manage.py migrate
   ```

6. **Start the server**
   ```bash
   python manage.py runserver
   ```

### Frontend

Simply open `frontend/index.html` in your browser or use Live Server.

## Environment Variables

Create a `.env` file in the `backend` directory with the following variables:

```env
DJANGO_SECRET_KEY=your-generated-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

See `.env.example` for a template.

## Tech Stack

- **Backend**: Django 5.2.10, Python
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Database**: SQLite (in-memory for queries)

## Features

- 🎯 Interactive SQL editor with syntax support
- 📊 Live query results visualization
- 🗃️ Database schema reference
- ⌨️ Keyboard shortcuts (Ctrl+Enter to run)
- 🔒 Safe sandbox (read-only queries)

## License

MIT