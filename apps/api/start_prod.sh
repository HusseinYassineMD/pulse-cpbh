#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

echo "Seeding demo data..."
python scripts/seed_demo.py --force

echo "Starting Pulse API on port ${PORT:-8000}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
