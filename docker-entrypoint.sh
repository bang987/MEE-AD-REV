#!/bin/bash
set -e

# Configuration
BACKEND_PORT=8000
FRONTEND_PORT=${PORT:-8080}

echo "Starting MED-AD-REV services..."
echo "Backend port: $BACKEND_PORT"
echo "Frontend port: $FRONTEND_PORT"

# Function to handle shutdown
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    wait $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start Backend (FastAPI with uvicorn)
cd /app/backend
echo "Starting backend..."
uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT &
BACKEND_PID=$!

# Wait for backend to be ready
echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    sleep 1
done

# Start Frontend (Next.js standalone)
cd /app/frontend
echo "Starting frontend..."
HOSTNAME="0.0.0.0" PORT=$FRONTEND_PORT node server.js &
FRONTEND_PID=$!

echo "All services started!"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend API: http://localhost:$BACKEND_PORT"

# Wait for any process to exit
wait -n $BACKEND_PID $FRONTEND_PID

# If one exits, kill the other
cleanup
