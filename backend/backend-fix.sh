#!/bin/bash

# Backend Express Fix Script
echo "🔧 Fixing Backend Express Dependencies..."

# Navigate to backend directory
cd backend

echo "🗑️ Cleaning existing installation..."
# Remove corrupted node_modules and lock file
rm -rf node_modules package-lock.json

echo "📦 Downgrading to stable Express v4..."
# Install stable Express version
npm install express@^4.18.2

echo "🔧 Installing missing dependencies..."
# Install missing qs module and types
npm install qs@^6.11.0
npm install --save-dev @types/express@^4.17.21 @types/qs@^6.9.7

echo "📚 Reinstalling all dependencies..."
# Clean install all dependencies
npm install

echo "✅ Dependencies fixed successfully!"

echo "🔍 Checking environment variables..."
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    npm run check-env
else
    echo "⚠️  .env file missing - create it with your environment variables"
fi

echo "🚀 Starting development server..."
echo "If this works, you should see: 'Backend server running on http://localhost:3001'"
npm run dev