#!/bin/bash

echo "=============================================="
echo "  AI Pharmacy Operations Manager"
echo "  Starting application..."
echo "=============================================="

# Load env
set -a
source .env 2>/dev/null
set +a

BACKEND_PORT=${BACKEND_PORT:-3001}
FRONTEND_PORT=${FRONTEND_PORT:-3000}

# Kill any processes on our ports
echo ""
echo "[1/6] Cleaning up ports $BACKEND_PORT and $FRONTEND_PORT..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
sleep 1
echo "  Ports cleaned."

# Check PostgreSQL
echo ""
echo "[2/6] Checking PostgreSQL..."
if ! command -v psql &> /dev/null; then
  echo "  ERROR: PostgreSQL is not installed. Please install it first."
  exit 1
fi

# Check if postgres is running
if ! pg_isready -q 2>/dev/null; then
  echo "  Starting PostgreSQL..."
  brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || {
    echo "  ERROR: Could not start PostgreSQL. Please start it manually."
    exit 1
  }
  sleep 2
fi
echo "  PostgreSQL is running."

# Create database if not exists
echo ""
echo "[3/6] Setting up database..."
createdb pharmacy_ops 2>/dev/null
echo "  Database ready."

# Install backend dependencies
echo ""
echo "[4/6] Installing backend dependencies..."
cd backend
npm install --silent 2>&1 | tail -1
echo "  Backend dependencies installed."

# Seed database
echo ""
echo "[5/6] Seeding database with sample data..."
node seed.js
cd ..

# Install frontend dependencies
echo ""
echo "[6/6] Installing frontend dependencies..."
cd frontend
npm install --silent 2>&1 | tail -1
echo "  Frontend dependencies installed."
cd ..

echo ""
echo "=============================================="
echo "  Starting servers with hot reload..."
echo "=============================================="
echo ""
echo "  Backend:  http://localhost:$BACKEND_PORT (nodemon)"
echo "  Frontend: http://localhost:$FRONTEND_PORT (react-scripts)"
echo ""
echo "  Login: admin@pharmacy.com / password123"
echo ""
echo "  Press Ctrl+C to stop all servers"
echo "=============================================="
echo ""

# Start backend with nodemon (hot reload) in background
cd backend
npx nodemon server.js &
BACKEND_PID=$!
cd ..

# Start frontend (react-scripts has built-in hot reload)
cd frontend
PORT=$FRONTEND_PORT BROWSER=none npm start &
FRONTEND_PID=$!
cd ..

# Cleanup on exit
cleanup() {
  echo ""
  echo "Shutting down servers..."
  kill $BACKEND_PID 2>/dev/null
  kill $FRONTEND_PID 2>/dev/null
  lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
  lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
  echo "Servers stopped. Goodbye!"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for both processes
wait
