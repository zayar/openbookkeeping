#!/bin/bash

echo "🚀 Starting OpenAccounting SaaS Application (Cloud SQL Only)"
echo "============================================"
echo "🔒 Database: Cloud SQL at 34.173.128.29"
echo "❌ Local MySQL: DISABLED"
echo "============================================"

# Kill any existing processes
pkill -f "node.*dev\|tsx.*watch\|next.*dev" 2>/dev/null || true

# Start BFF server in background
echo "🔗 Starting BFF Server on port 3001..."
cd apps/bff
npm run dev > bff.log 2>&1 &
BFF_PID=$!

# Wait for BFF to be ready
echo "⏳ Waiting for BFF server to start..."
sleep 8

# Start Frontend server in background  
echo "🎨 Starting Frontend Server on port 3000..."
cd ../web
npm run dev > web.log 2>&1 &
WEB_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for frontend server to start..."
sleep 5

echo ""
echo "============================================"
echo "🎉 SERVERS STARTED!"
echo "============================================"
echo "📱 Frontend:  http://localhost:3000"
echo "🔗 BFF API:   http://localhost:3001"
echo "🩺 Health:    http://localhost:3001/health"
echo ""
echo "Test the application by visiting http://localhost:3000"
echo "Press Ctrl+C to stop all servers"
echo "============================================"

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "⛔ Stopping servers..."
    kill $BFF_PID $WEB_PID 2>/dev/null
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
