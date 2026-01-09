# Deployment Guide for Live Polling System

## Backend Deployment (Node.js + Socket.io)

### Option 1: Render (Recommended)

1. Create `server.ts` in project root:

```typescript
import express, { Express } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(express.json());
app.use(cors());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI!).then(() => {
  console.log('MongoDB connected');
});

// Setup Socket.io handlers here

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

2. Create `Procfile`:

```
web: node --loader ts-node/esm server.ts
```

3. Push to GitHub and connect to Render
4. Set environment variable: `MONGODB_URI`

### Option 2: Railway

1. Connect GitHub repository
2. Add Node service
3. Set environment variables
4. Railway auto-deploys on git push

### Option 3: Heroku

```bash
heroku login
heroku create your-app-name
heroku config:set MONGODB_URI=your-mongodb-uri
git push heroku main
```

## Frontend Deployment (Next.js on Vercel)

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
   - `MONGODB_URI=your-mongodb-uri`
6. Click Deploy

## Database Setup

### MongoDB Atlas (Cloud)

1. Go to [mongodb.com/cloud](https://mongodb.com/cloud)
2. Create free cluster
3. Add user (username/password)
4. Get connection string
5. Add to `.env.local` and deployment platform

### Local MongoDB

```bash
# Install MongoDB
# macOS
brew tap mongodb/brew
brew install mongodb-community

# Start service
brew services start mongodb-community

# Connection string
MONGODB_URI=mongodb://localhost:27017/polling_system
```

## Environment Variables Checklist

Development (`.env.local`):
```env
MONGODB_URI=mongodb://localhost:27017/polling_system
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Production (Vercel + Render):
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/polling_system
NEXT_PUBLIC_API_URL=https://your-frontend.vercel.app
```

## Health Checks

### Verify Frontend
- Visit your Vercel URL
- Test teacher and student flows
- Check browser console for errors

### Verify Backend (if using Socket.io)
```bash
curl https://your-backend-url.com/health
# Should return: {"status":"ok"}
```

### Verify Database
```bash
mongosh "mongodb+srv://user:pass@cluster.mongodb.net/polling_system"
# Should connect successfully
```

## Common Issues

**Issue:** WebSocket connection fails
- Solution: Check CORS settings in Socket.io
- Verify backend URL is correct in frontend env vars

**Issue:** Database connection timeout
- Solution: Whitelist IP addresses in MongoDB Atlas
- Check connection string format

**Issue:** Poll data not persisting
- Solution: Verify MongoDB is running
- Check database connection string

**Issue:** Timer goes out of sync
- Solution: This is normal for late joins - server provides correct time
- Client timer will adjust on next poll start

## Monitoring

Add monitoring with:
- **Vercel Analytics** - Built-in frontend monitoring
- **Sentry** - Error tracking
- **MongoDB Atlas Charts** - Database monitoring
- **Custom logging** - Add console logs to API routes

```typescript
// Add to API routes
console.log('[API] Action:', action, 'Timestamp:', new Date());
```

## Scaling Considerations

For large classrooms (100+ students):
1. Use load balancing (Redis adapter for Socket.io)
2. Implement connection pooling for MongoDB
3. Add caching for poll results
4. Use edge functions for reduced latency

## Backup & Recovery

1. Enable MongoDB automated backups
2. Regular export of poll data:

```bash
mongoexport --uri="mongodb+srv://user:pass@cluster.mongodb.net/polling_system" \
  --collection=polls --out=polls-backup.json
```

3. Store backups in cloud storage (AWS S3, Google Cloud Storage)
