#!/bin/bash

echo "🚀 Firebase Hosting Deployment Script"
echo "======================================"

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Navigate to web app directory
cd apps/web

echo "🔨 Building Next.js app for static export..."
npm run build:export

# Navigate back to root
cd ../..

echo "📁 Build output directory: apps/web/out"
ls -la apps/web/out

echo "🔐 Login to Firebase (if not already logged in)..."
firebase login

echo "🚀 Deploying to Firebase Hosting..."
firebase deploy --only hosting

echo "✅ Deployment complete!"
echo "🌐 Your app is live at: https://aiaccount-1c845.web.app"
