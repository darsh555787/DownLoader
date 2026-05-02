# Deployment Guide — Darsh Downloader

This app has two parts:
- **Frontend** (React) → deploy on Vercel (free)
- **Backend** (Express + yt-dlp) → deploy on Railway (free tier)

Vercel alone cannot run this app because yt-dlp is a system binary that requires a real server environment. Vercel only runs short serverless functions with no persistent filesystem or binary execution.

---

## Step 1 — Deploy Backend on Railway

Railway gives you a real Linux server that can run Node.js and install yt-dlp.

### 1.1 Create a Railway account
Go to [https://railway.app](https://railway.app) and sign up with GitHub.

### 1.2 Create a new project
- Click **New Project**
- Select **Deploy from GitHub repo**
- Choose your `DownLoader` repository
- Railway will detect it automatically

### 1.3 Set the root directory
In Railway project settings → **Source** → set **Root Directory** to `server`

### 1.4 Add yt-dlp to the server

Railway runs on Linux. Add a `nixpacks.toml` file inside the `server/` folder to install yt-dlp and ffmpeg:

```toml
# server/nixpacks.toml
[phases.setup]
nixPkgs = ["yt-dlp", "ffmpeg"]
```

### 1.5 Set environment variables in Railway
In Railway → your service → **Variables**, add:
```
PORT = 5000
NODE_ENV = production
```

### 1.6 Get your Railway backend URL
After deploy, Railway gives you a URL like:
```
https://your-app-name.up.railway.app
```
Copy this — you need it for Vercel.

---

## Step 2 — Deploy Frontend on Vercel

### 2.1 Create a Vercel account
Go to [https://vercel.com](https://vercel.com) and sign up with GitHub.

### 2.2 Import your GitHub repo
- Click **Add New Project**
- Select your `DownLoader` repository
- Vercel will auto-detect the `vercel.json` config

### 2.3 Set environment variables in Vercel
In Vercel → your project → **Settings** → **Environment Variables**, add:
```
VITE_API_URL = https://your-app-name.up.railway.app
```
Replace the URL with your actual Railway backend URL from Step 1.6.

### 2.4 Deploy
Click **Deploy**. Vercel will run:
```
cd client && npm install && npm run build
```
And serve the `client/dist` folder.

---

## Step 3 — Install as Android App (PWA)

The app is a Progressive Web App (PWA). To install it on Android:

1. Open your Vercel URL in **Chrome on Android**
2. Tap the **"Install App"** button in the top-right of the app
3. Or tap Chrome menu (⋮) → **Add to Home Screen**
4. The app installs like a native app with its own icon

---

## Architecture Overview

```
Android / Browser
      │
      ▼
Vercel (Frontend)
  React + Vite
  your-app.vercel.app
      │
      │  API calls (VITE_API_URL)
      ▼
Railway (Backend)
  Express + yt-dlp + ffmpeg
  your-app.up.railway.app
      │
      ▼
  Downloads folder (server/downloads/)
```

---

## Local Development

Run both servers locally:

```bash
# Terminal 1 — Backend
cd server
npm install
npm run dev
# Runs on http://localhost:5000

# Terminal 2 — Frontend
cd client
npm install
npm run dev
# Runs on http://localhost:3000
```

---

## Troubleshooting

**White screen on Vercel**
- Make sure `VITE_API_URL` is set in Vercel environment variables
- Redeploy after adding the variable

**Downloads not working**
- Check Railway logs for yt-dlp errors
- Make sure `nixpacks.toml` is present in the `server/` folder
- Verify Railway service is running (not sleeping)

**CORS errors**
- The backend already has CORS enabled for all origins
- If you see CORS errors, check that `VITE_API_URL` matches your Railway URL exactly (no trailing slash)
