#!/bin/sh
set -e

# Wait for the database to be ready
echo "Waiting for database to be ready..."
while ! nc -z db 5432; do
  sleep 0.1
done
echo "Database is ready!"

# Run database migrations
echo "Running database migrations..."
npm run db:push

# Start the application
echo "Starting the application..."
exec "$@"