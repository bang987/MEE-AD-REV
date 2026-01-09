#!/bin/bash
set -e

# Railway injects PORT env var
FRONTEND_PORT=${PORT:-8080}
BACKEND_PORT=8000

echo "=== MED-AD-REV Starting ==="
echo "Frontend port: $FRONTEND_PORT (Railway PORT)"
echo "Backend port: $BACKEND_PORT"

# Function to handle shutdown
cleanup() {
    echo "Shutting down services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 0
}

trap cleanup SIGTERM SIGINT

# Start Backend (FastAPI with uvicorn)
cd /app/backend
echo "Starting backend on port $BACKEND_PORT..."
echo "Testing Python imports..."
python -c "import main; print('Backend imports OK')" 2>&1 || echo "Backend import failed!"
echo "Starting uvicorn..."
uvicorn main:app --host 0.0.0.0 --port $BACKEND_PORT 2>&1 &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

# Wait for backend to be ready (max 60 seconds)
echo "Waiting for backend to be ready..."
for i in $(seq 1 60); do
    if curl -sf http://localhost:$BACKEND_PORT/health > /dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    if [ $i -eq 60 ]; then
        echo "Warning: Backend health check timeout, continuing anyway..."
    fi
    sleep 1
done

# Start Frontend (Next.js standalone)
cd /app/frontend
echo "Starting frontend on port $FRONTEND_PORT..."
HOSTNAME="0.0.0.0" PORT=$FRONTEND_PORT node server.js &
FRONTEND_PID=$!

# Wait for frontend to be ready (max 30 seconds)
echo "Waiting for frontend to be ready..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:$FRONTEND_PORT > /dev/null 2>&1; then
        echo "Frontend is ready!"
        break
    fi
    sleep 1
done

echo "=== All services started ==="
echo "Frontend: http://0.0.0.0:$FRONTEND_PORT"
echo "Backend API: http://0.0.0.0:$BACKEND_PORT"

# Keep the script running
wait $BACKEND_PID $FRONTEND_PID
