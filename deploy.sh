#!/bin/bash

# AI Accounting Deployment Script
set -e

echo "🚀 Starting AI Accounting deployment..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Not authenticated with gcloud. Please run 'gcloud auth login' first."
    exit 1
fi

# Set variables
PROJECT_ID=${GCP_PROJECT_ID:-$(gcloud config get-value project)}
REGION=${GCP_REGION:-us-central1}
OA_DB_PASSWORD_SECRET="OA_DB_PASSWORD"
JWT_SECRET_SECRET="JWT_SECRET"

echo "📋 Deployment Configuration:"
echo "  Project ID: $PROJECT_ID"
echo "  Region: $REGION"
echo "  Database Host: 34.123.50.107"
echo "  Database User: gtadmin"
echo "  Database Name: openaccounting"

# Confirm deployment
read -p "Continue with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled."
    exit 1
fi

# Create secrets if they don't exist
echo "🔐 Setting up secrets..."

# Check if OA_DB_PASSWORD secret exists
if ! gcloud secrets describe $OA_DB_PASSWORD_SECRET --project=$PROJECT_ID &> /dev/null; then
    echo "Creating OA_DB_PASSWORD secret..."
    echo "gtapp456$%^" | gcloud secrets create $OA_DB_PASSWORD_SECRET --data-file=- --project=$PROJECT_ID
else
    echo "Updating OA_DB_PASSWORD secret..."
    echo "gtapp456$%^" | gcloud secrets versions add $OA_DB_PASSWORD_SECRET --data-file=- --project=$PROJECT_ID
fi

# Check if JWT_SECRET secret exists
if ! gcloud secrets describe $JWT_SECRET_SECRET --project=$PROJECT_ID &> /dev/null; then
    echo "Creating JWT_SECRET secret..."
    openssl rand -base64 32 | gcloud secrets create $JWT_SECRET_SECRET --data-file=- --project=$PROJECT_ID
else
    echo "Updating JWT_SECRET secret..."
    openssl rand -base64 32 | gcloud secrets versions add $JWT_SECRET_SECRET --data-file=- --project=$PROJECT_ID
fi

# Deploy OA Server
echo "🐳 Deploying Open Accounting Server..."
cd apps/oa-server-deploy
gcloud run deploy oa-server \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="DB_HOST=34.123.50.107,DB_USER=gtadmin,DB_NAME=openaccounting" \
    --set-secrets="DB_PASSWORD=$OA_DB_PASSWORD_SECRET:latest" \
    --project $PROJECT_ID

OA_URL=$(gcloud run services describe oa-server --region=$REGION --format="value(status.url)")
echo "✅ OA Server deployed at: $OA_URL"

# Deploy BFF
echo "🔧 Deploying BFF..."
cd ../bff
gcloud run deploy accounting-bff \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="OA_BASE_URL=$OA_URL" \
    --set-secrets="JWT_SECRET=$JWT_SECRET_SECRET:latest" \
    --project $PROJECT_ID

BFF_URL=$(gcloud run services describe accounting-bff --region=$REGION --format="value(status.url)")
echo "✅ BFF deployed at: $BFF_URL"

# Deploy Web App
echo "🌐 Deploying Web Application..."
cd ../web
gcloud run deploy accounting-web \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --set-env-vars="BFF_URL=$BFF_URL" \
    --project $PROJECT_ID

WEB_URL=$(gcloud run services describe accounting-web --region=$REGION --format="value(status.url)")
echo "✅ Web App deployed at: $WEB_URL"

# Setup database
echo "🗄️ Setting up database..."
cd ../oa-server-deploy
echo "Running database setup..."
node scripts/setup-db.js

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📱 Application URLs:"
echo "  Web App: $WEB_URL"
echo "  BFF API: $BFF_URL"
echo "  OA Server: $OA_URL"
echo ""
echo "🔐 Secrets configured:"
echo "  OA_DB_PASSWORD: ✅"
echo "  JWT_SECRET: ✅"
echo ""
echo "📊 Next steps:"
echo "  1. Visit $WEB_URL to access the application"
echo "  2. Create your first account and organization"
echo "  3. The default Chart of Accounts will be automatically seeded"
echo ""
echo "💡 For local development, run: pnpm dev"
