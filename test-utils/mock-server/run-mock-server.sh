#!/bin/bash

echo "🧪 Time Range Testing Script"
echo "=========================="

echo "📋 Instructions:"
echo "1. No dependencies required - uses Node.js built-in modules only!"
echo "2. Make sure your tx-api is stopped (if running)"
echo "3. Open Analytics Dashboard in browser (http://localhost:3000)"
echo "4. Test different time ranges (1h, 24h, 7d, 30d)"
echo "5. Press Ctrl+C here to stop the mock server when done"
echo ""

read -p "Press Enter to start mock server or Ctrl+C to cancel..."

echo ""
echo "🚀 Starting Mock Analytics Server..."
echo "📍 URL: http://localhost:8000"
echo "💡 No dependencies required!"
echo ""

# Start the mock server (ensure we're in the right directory)
cd "$(dirname "$0")"
node mock-analytics-server.js