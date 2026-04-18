# ChartX Admin Backend v2.0

Complete Node.js + Express + MongoDB backend for ChartX application.

## 📁 Project Structure

```
backend-admin/
├── server.js                 # Main Express server
├── package.json              # Dependencies
├── .env.example              # Environment variables template
├── middleware/
│   └── auth.js               # JWT authentication middleware
├── models/
│   ├── Admin.js              # Admin model
│   ├── User.js               # User model with warnings
│   └── Analytics.js          # Analytics model
├── routes/
│   ├── auth.js               # Admin + User authentication
│   ├── users.js              # User CRUD operations
│   ├── licenses.js           # License verification & credits
│   ├── analytics.js          # Dashboard analytics
│   └── warnings.js           # Notification system
└── public/
    ├── index.html            # Admin dashboard UI
    └── app.js                # Dashboard JavaScript
```

## 🚀 Deployment Guide

### Step 1: Create MongoDB Database

1. Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a free account (or login)
3. Create a new cluster (free tier works)
4. Click "Database Access" → Add new user with password
5. Click "Network Access" → Add IP `0.0.0.0/0` (allow all)
6. Click "Database" → "Connect" → "Connect your application"
7. Copy the connection string (looks like `mongodb+srv://...`)

### Step 2: Deploy to Render

1. Create a GitHub repository and push the `backend-admin` folder
2. Go to [Render.com](https://render.com) and sign up/login
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Configure the service:

   | Setting | Value |
   |---------|-------|
   | Name | `chartx-backend` |
   | Root Directory | `backend-admin` |
   | Environment | `Node` |
   | Build Command | `npm install` |
   | Start Command | `npm start` |

6. Add Environment Variables:

   | Key | Value |
   |-----|-------|
   | `MONGODB_URI` | Your MongoDB connection string |
   | `JWT_SECRET` | A long random string (e.g., `my-super-secret-key-123456789`) |
   | `ADMIN_USERNAME` | `admin` |
   | `ADMIN_PASSWORD` | `ARBDXCHART123` |
   | `FRONTEND_URL` | Your Lovable app URL |

7. Click "Create Web Service"
8. Wait for deployment (takes 2-3 minutes)
9. Copy your backend URL (e.g., `https://chartx-backend.onrender.com`)

### Step 3: Update Frontend

In your Lovable app, update `src/lib/backendApi.ts`:

```typescript
const BACKEND_URL = 'https://your-render-url.onrender.com';
```

## 🔐 Admin Credentials

- **Username:** `admin`
- **Password:** `ARBDXCHART123`

Access admin dashboard at: `https://your-backend-url.onrender.com`

## 📡 API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Admin login |
| GET | `/api/auth/verify` | Verify admin token |
| POST | `/api/auth/register` | User registration |
| POST | `/api/auth/user-login` | User login |

### Users (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| GET | `/api/users/by-license/:key` | Get user by license |
| POST | `/api/users` | Create user |
| PATCH | `/api/users/:id/credits` | Update credits |
| PATCH | `/api/users/:id/membership` | Update membership |
| PATCH | `/api/users/:id/block` | Block/unblock user |
| PATCH | `/api/users/:id/extend` | Extend license |
| DELETE | `/api/users/:id` | Delete user |

### Licenses (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/licenses/verify` | Verify license key |
| POST | `/api/licenses/activate` | Activate license |
| POST | `/api/licenses/use-credit` | Use credit |
| GET | `/api/licenses/stats` | License stats (admin) |

### Warnings

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/warnings/license/:key` | Get warnings by license |
| GET | `/api/warnings/user-notifications/:id` | Get by user ID |
| PATCH | `/api/warnings/license/:key/:id/read` | Mark as read |
| POST | `/api/warnings/send` | Send warning (admin) |
| POST | `/api/warnings/broadcast` | Broadcast to all (admin) |

### Analytics (Admin Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/analytics/dashboard` | Dashboard stats |
| GET | `/api/analytics/range` | Analytics by date range |
| POST | `/api/analytics/signal` | Log signal (public) |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |

## 🔄 User Flow

1. **Registration:** User signs up → Gets 5 free credits + license key
2. **Login:** User logs in with email/password → Gets JWT token
3. **License Login:** User enters license key → Verified + logged in
4. **Use Credits:** Each chart analysis uses 1 credit
5. **Notifications:** Admin can send warnings/broadcasts

## 📊 Features

- ✅ User registration with 5 free credits
- ✅ Email/password authentication
- ✅ License key authentication
- ✅ Device fingerprint locking
- ✅ Credit management
- ✅ Membership tiers (free, nano, starter, popular, expert, investor)
- ✅ User blocking/unblocking
- ✅ Warning/notification system
- ✅ Broadcast messages
- ✅ Analytics dashboard
- ✅ Beautiful admin UI
