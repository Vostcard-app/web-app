#!/bin/bash
echo "🛑 Stopping all dev servers..."
pkill -f "vite|npm.*dev|yarn.*dev|node.*vite" 2>/dev/null || true

echo "🧹 Cleaning up ports 5173 and 5174..."
lsof -ti:5173,5174 2>/dev/null | xargs kill -9 2>/dev/null || true

sleep 2

echo "🔍 Checking port status..."
lsof -ti:5173 >/dev/null && echo "❌ Port 5173 still busy" || echo "✅ Port 5173 free"
lsof -ti:5174 >/dev/null && echo "❌ Port 5174 still busy" || echo "✅ Port 5174 free"

echo "🚀 Starting fresh dev server..."
npm run dev 