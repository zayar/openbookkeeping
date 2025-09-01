# 🚀 Manual Firebase Deployment (No npm install needed)

## Quick Deploy Without Installing Firebase CLI Globally

### Step 1: Use npx (No Installation Required)
```bash
# Login to Firebase
npx firebase login

# Check if you're logged in
npx firebase projects:list
```

### Step 2: Build Your Next.js App
```bash
cd apps/web
npm run build
```

### Step 3: Create Export Directory
```bash
# If build succeeds, create export
npm run export
# This creates the 'out' directory
```

### Step 4: Deploy with npx
```bash
# Go back to project root
cd ../..

# Deploy using npx (no global install needed)
npx firebase deploy --only hosting

# OR deploy with specific project
npx firebase deploy --only hosting --project aiaccount-1c845
```

## Alternative: Firebase Web Console Upload

If command line is not working:

1. **Build your app**:
   ```bash
   cd apps/web
   npm run build:export
   ```

2. **Go to Firebase Console**:
   - Visit: https://console.firebase.google.com
   - Select project: `aiaccount-1c845`
   - Go to Hosting section

3. **Manual Upload**:
   - Click "Get Started" or "Add Another Site"
   - Upload the entire `apps/web/out` folder
   - Configure domain settings

## 🎯 Your Live URLs
- Primary: https://aiaccount-1c845.web.app
- Alternative: https://aiaccount-1c845.firebaseapp.com

## ✅ Files Ready for Deployment
All configuration files are already created:
- ✅ `firebase.json`
- ✅ `.firebaserc` 
- ✅ `apps/web/next.config.js` (configured for static export)
- ✅ `apps/web/lib/firebase.ts` (Firebase SDK setup)

Just run the commands above when you're ready! 🚀
