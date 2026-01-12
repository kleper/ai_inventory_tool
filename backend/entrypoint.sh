#!/bin/bash
set -e

# Run database migrations
echo "Running database migrations..."
alembic upgrade head

# Run manual patch scripts
echo "Running manual schema patches..."
python migrate_language.py
python migrate_share.py

# Start the application
echo "Starting Uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
