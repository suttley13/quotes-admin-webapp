# Quotes Admin Dashboard

A Next.js webapp for managing inspirational quotes with push notification capabilities.

## Features

- **Clerk Authentication**: Secure admin access with email whitelist
- **Quote Generation**: Generate quotes using OpenAI GPT-5 API
- **Push Notifications**: Send quotes to iOS devices via Firebase Cloud Messaging
- **Quote Management**: View history and manage sent quotes
- **Automated Sending**: GitHub Actions for scheduled quote delivery
- **Analytics**: Track delivery statistics and device registrations

## Setup

### 1. Environment Variables

Create `.env.local` with the following variables:

```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Database (Vercel Postgres)
POSTGRES_URL=postgresql://...
POSTGRES_PRISMA_URL=postgresql://...
POSTGRES_URL_NO_SSL=postgresql://...
POSTGRES_URL_NON_POOLING=postgresql://...
POSTGRES_USER=default
POSTGRES_HOST=...
POSTGRES_PASSWORD=...
POSTGRES_DATABASE=verceldb

# OpenAI API
OPENAI_API_KEY=sk-proj-...

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-...@your-project.iam.gserviceaccount.com

# API Security
API_SECRET_KEY=your-secret-key-for-github-actions

# Admin Emails (comma separated)
ADMIN_EMAILS=admin@example.com,admin2@example.com
```

### 2. Database Setup

1. Create a Vercel Postgres database
2. Visit `/api/init` to initialize database tables

### 3. Firebase Setup

1. Create a Firebase project
2. Enable Cloud Messaging
3. Download service account key
4. Add iOS app to Firebase project
5. Configure APNs certificates

### 4. Clerk Setup

1. Create Clerk application
2. Configure email whitelist in dashboard
3. Set redirect URLs

### 5. GitHub Actions

Set these secrets in your GitHub repository:

- `API_SECRET_KEY`: Same as your `.env.local`
- `BACKEND_URL`: Your deployed Vercel app URL (e.g., https://your-app.vercel.app)

## Deployment

```bash
# Install dependencies
npm install

# Deploy to Vercel
vercel --prod
```

## iOS App Changes

1. Add Firebase SDK to your iOS project
2. Configure `GoogleService-Info.plist`
3. Replace local notification system with Firebase push notifications
4. Register device tokens with backend API

## API Endpoints

- `POST /api/quotes/generate` - Generate new quote
- `POST /api/quotes/send` - Send quote to all devices  
- `GET /api/quotes` - Get quote history
- `POST /api/devices/register` - Register device token
- `GET /api/stats` - Get analytics
- `POST /api/init` - Initialize database

## Usage

1. Login to admin dashboard
2. Generate new quotes and review them
3. Send immediately with "Send Now" button
4. Or let GitHub Actions send automatically on schedule
5. Monitor delivery stats in Dashboard

## Manual Quote Sending

You can also trigger quote sending via GitHub Actions:

1. Go to Actions tab in GitHub
2. Select "Send Daily Quote" workflow  
3. Click "Run workflow"