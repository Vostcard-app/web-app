#!/bin/bash
echo "🗺️ Starting Vostcard Development Environment"
echo "📍 Project: Vostcard"
echo "🔥 Firebase Project: vostcard-a3b71"
echo "🌐 Port: 5173"

# Clear any cached data
echo "🧹 Clearing cache..."
rm -rf dist node_modules/.cache

# Verify we're in the right directory
if [ ! -f "package.json" ] || ! grep -q "vostcard" package.json; then
    echo "❌ ERROR: Not in Vostcard directory!"
    exit 1
fi

# Start development server
echo "🚀 Starting development server..."
npm run dev