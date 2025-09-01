#!/bin/bash

echo "🚀 Starting OpenAccounting SaaS Application"
echo "============================================"

# Start BFF server in background
echo "🔗 Starting BFF Server on port 3001..."
cd apps/bff
npm run dev &
BFF_PID=$!

# Wait for BFF to be ready
sleep 5

# Start Frontend server in background  
echo "🎨 Starting Frontend Server on port 3000..."
cd ../web
npm run dev &
WEB_PID=$!

# Wait for frontend to be ready
sleep 3

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
