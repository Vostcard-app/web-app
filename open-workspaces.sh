#!/bin/bash

echo "🚀 Project Workspace Launcher"
echo "================================"
echo ""
echo "Which project would you like to open?"
echo ""
echo "1) 🗺️  Vostcard"
echo "2) 🏠  B&B-Keeper" 
echo "3) 📂  Open both workspaces"
echo "4) ❌  Cancel"
echo ""
read -p "Enter your choice (1-4): " choice

case $choice in
    1)
        echo "🗺️ Opening Vostcard workspace..."
        code vostcard-workspace.code-workspace
        ;;
    2)
        echo "🏠 Opening B&B-Keeper workspace..."
        code bnb-workspace.code-workspace
        ;;
    3)
        echo "📂 Opening both workspaces..."
        code vostcard-workspace.code-workspace
        sleep 1
        code bnb-workspace.code-workspace
        ;;
    4)
        echo "❌ Cancelled"
        ;;
    *)
        echo "❌ Invalid choice"
        ;;
esac