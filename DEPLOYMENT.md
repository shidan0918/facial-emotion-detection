# Deployment Guide

This guide will help you deploy your Live Facial Emotion Detection website to GitHub and cloud platforms.

## 🐙 GitHub Setup

### 1. Create GitHub Repository

1. Go to [GitHub](https://github.com) and sign in
2. Click the **"+"** button → **"New repository"**
3. Repository name: `facial-emotion-detection` (or your preferred name)
4. Description: `Live facial emotion detection website using deep learning`
5. Make it **Public** (so Vercel can access it)
6. **Don't** initialize with README (we already have one)
7. Click **"Create repository"**

### 2. Push to GitHub

```bash
# Add the remote repository (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/facial-emotion-detection.git

# Push to GitHub
git branch -M main
git push -u origin main
```

## ☁️ Cloud Deployment Options

### Option 1: Vercel (Recommended for Frontend-Heavy Apps)

#### Pros:
- ✅ Excellent for Next.js/React (though works with Flask)
- ✅ Great CDN and edge network
- ✅ Easy GitHub integration
- ✅ Good free tier

#### Cons:
- ⚠️ **50MB limit** might be tight with TensorFlow
- ⚠️ **10-second timeout** on free tier (our model loads in ~2-3 seconds)
- ⚠️ Serverless functions may have cold start issues

#### Deploy to Vercel:
1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"New Project"**
4. Import your `facial-emotion-detection` repository
5. **Framework Preset**: Other
6. **Build Command**: Leave empty
7. **Output Directory**: Leave empty
8. **Install Command**: `pip install -r requirements.txt`
9. Click **"Deploy"**

### Option 2: Railway (Recommended for ML Apps)

#### Pros:
- ✅ **Better for ML/AI apps** with larger memory limits
- ✅ **No timeout issues** - persistent containers
- ✅ **500MB+ memory** can handle TensorFlow easily
- ✅ Great for Python/Flask apps
- ✅ Simple deployment process

#### Cons:
- ⚠️ Slightly more expensive than Vercel free tier
- ⚠️ Less edge locations than Vercel

#### Deploy to Railway:
1. Go to [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click **"New Project"**
4. Choose **"Deploy from GitHub repo"**
5. Select your `facial-emotion-detection` repository
6. Railway will automatically:
   - Detect it's a Python app
   - Install dependencies from `requirements.txt`
   - Use the `railway.toml` configuration
   - Start with the command in `Procfile`
7. Click **"Deploy"**

### Option 3: Heroku (Traditional Choice)

```bash
# Install Heroku CLI first, then:
heroku login
heroku create your-app-name
git push heroku main
```

## 🔧 Configuration Files Included

Your project includes all necessary deployment files:

- **`vercel.json`** - Vercel configuration
- **`railway.toml`** - Railway configuration
- **`Procfile`** - Process file for Heroku/Railway
- **`requirements.txt`** - Python dependencies
- **`.gitignore`** - Files to ignore in Git

## 🚨 Important Notes

### Camera Access Requirements:
- **HTTPS is required** for camera access in production
- All modern deployment platforms provide HTTPS automatically
- Local development works with HTTP (localhost exception)

### Model File Size:
- Your model (`model_cnn_grayscale.keras`) is ~9MB
- This might be close to Vercel's limits
- Railway handles this much better

### Environment Variables:
No environment variables needed - everything is configured automatically!

## 🎯 Recommended Deployment Strategy

**For best results, I recommend Railway** because:

1. **Better ML support** - handles TensorFlow/OpenCV without issues
2. **No timeout problems** - persistent containers
3. **Sufficient memory** - can handle model loading
4. **Simple deployment** - just connect GitHub and deploy

## 🔍 Testing Your Deployment

After deployment, test these endpoints:
- `/` - Main application
- `/health` - Health check (should return `{"status": "healthy", "model_loaded": true}`)
- `/predict` - Emotion detection API

## 🛠️ Troubleshooting

### Common Issues:

1. **Model not loading:**
   - Check file path in logs
   - Ensure `research/model_cnn_grayscale.keras` is in repo

2. **Camera not working:**
   - Ensure HTTPS is enabled
   - Check browser permissions

3. **Memory issues:**
   - Try Railway instead of Vercel
   - Check deployment logs

4. **Timeout issues:**
   - Use Railway (no serverless timeouts)
   - Optimize model loading

## 📊 Expected Performance

- **Model loading**: ~2-3 seconds on first request
- **Inference time**: ~50-100ms per prediction
- **Detection rate**: ~10 FPS
- **Memory usage**: ~200-300MB

Happy deploying! 🚀