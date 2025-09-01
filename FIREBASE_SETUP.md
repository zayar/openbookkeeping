# 🔥 Firebase Hosting Setup Guide

## 📋 Prerequisites

Your Firebase project details:
- **Project ID**: `aiaccount-1c845`
- **Domain**: `https://aiaccount-1c845.web.app`
- **Auth Domain**: `aiaccount-1c845.firebaseapp.com`

## 🚀 Quick Setup Steps

### 1. Install Firebase CLI
```bash
# Option A: Global install (if you have permissions)
npm install -g firebase-tools

# Option B: Use npx (no installation needed)
npx firebase-tools --version
```

### 2. Login to Firebase
```bash
firebase login
# OR with npx
npx firebase login
```

### 3. Initialize Firebase in Your Project
```bash
# Navigate to your project root
cd /Users/zayarmin/Development/openaccounting

# Initialize (files already created)
firebase init hosting
```

### 4. Build and Deploy
```bash
# Method 1: Use our deployment script
./deploy-firebase.sh

# Method 2: Manual deployment
cd apps/web
npm run build:export
cd ../..
firebase deploy --only hosting
```

## 📁 Files Created

✅ **firebase.json** - Firebase hosting configuration
✅ **.firebaserc** - Project configuration  
✅ **apps/web/lib/firebase.ts** - Firebase SDK setup
✅ **deploy-firebase.sh** - Automated deployment script
✅ **apps/web/next.config.js** - Updated for static export

## ⚙️ Configuration Details

### Firebase Hosting Config (`firebase.json`)
```json
{
  "hosting": {
    "public": "apps/web/out",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "destination": "https://your-backend-url.com/api/**"
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Next.js Configuration
- ✅ **Static Export**: `output: 'export'`
- ✅ **Trailing Slash**: For better Firebase routing
- ✅ **Unoptimized Images**: Required for static export
- ✅ **Environment Variables**: Backend URL configuration

## 🌐 Deployment Process

### What Happens During Deployment:

1. **Build Phase**:
   ```bash
   npm run build:export
   ```
   - Creates static files in `apps/web/out/`
   - Optimizes CSS, JS, and assets
   - Generates HTML for all routes

2. **Deploy Phase**:
   ```bash
   firebase deploy --only hosting
   ```
   - Uploads files to Firebase CDN
   - Configures routing rules
   - Sets up custom domain (if configured)

### Expected Output Directory Structure:
```
apps/web/out/
├── index.html
├── _next/
│   ├── static/
│   └── ...
├── bank-accounts/
├── invoices/
├── customers/
└── ...
```

## 🔧 Backend Integration

### API Configuration
Since this is a static site, API calls need to be configured:

1. **Update Backend URL** in `firebase.json`:
   ```json
   "rewrites": [
     {
       "source": "/api/**", 
       "destination": "https://your-actual-backend.com/api/**"
     }
   ]
   ```

2. **Environment Variables**:
   - Update `BFF_URL` in Next.js config
   - Set production backend URL

### CORS Configuration
Make sure your backend allows requests from:
- `https://aiaccount-1c845.web.app`
- `https://aiaccount-1c845.firebaseapp.com`

## 🚀 Quick Deploy Commands

```bash
# Quick deploy (if everything is set up)
cd /Users/zayarmin/Development/openaccounting
./deploy-firebase.sh

# Manual deploy
cd apps/web
npm run firebase:build
cd ../..
firebase deploy --only hosting

# Preview before deploy
firebase serve --only hosting
```

## 🎯 Live URLs

After deployment, your app will be available at:
- **Primary**: https://aiaccount-1c845.web.app
- **Alternative**: https://aiaccount-1c845.firebaseapp.com

## 🔍 Troubleshooting

### Common Issues:

1. **Firebase CLI not found**:
   ```bash
   npx firebase-tools login
   npx firebase-tools deploy --only hosting
   ```

2. **Build fails**:
   ```bash
   cd apps/web
   rm -rf .next out
   npm run build:export
   ```

3. **API calls fail**:
   - Check `firebase.json` rewrites
   - Update backend URL
   - Verify CORS settings

4. **Static export errors**:
   - Remove dynamic routes if any
   - Check `next.config.js` configuration
   - Ensure all images use `unoptimized: true`

## 📊 Next Steps

1. **Custom Domain** (Optional):
   ```bash
   firebase hosting:channel:deploy production --only hosting
   ```

2. **Analytics Setup**:
   - Firebase Analytics is already configured
   - Will automatically track page views

3. **Performance Monitoring**:
   ```bash
   npm install firebase/performance
   ```

4. **Backend Deployment**:
   - Deploy your BFF to Cloud Run, Vercel, or Railway
   - Update API URLs in `firebase.json`

---

## ✅ Ready to Deploy!

All configuration files are created. Just run:
```bash
./deploy-firebase.sh
```

Your OpenAccounting app will be live in minutes! 🎉
