# EcoPoints Frontend - API Integration Guide

## Dashboard & Authentication Features

This PR adds a complete Dashboard with API integration ready for your backend.

### 🎯 Features Added

1. **Dashboard Page** (`/dashboard`)
   - User stats overview (total points, streak, weekly/monthly points, rank)
   - Weekly progress chart
   - Recent activities list
   - Quick action buttons

2. **API Service Layer** (`src/services/api.ts`)
   - Axios-based API client
   - Authentication token management
   - Error handling
   - All endpoint methods ready to connect

3. **Protected Routes**
   - Authentication-based routing
   - Automatic redirect to login for unauthenticated users

4. **Updated Auth Pages**
   - Login and SignUp now integrate with backend API
   - Form validation
   - Error handling

### 🔌 API Endpoints to Implement in Backend

#### Authentication Endpoints
```
POST /api/auth/register
Body: { name: string, email: string, password: string }
Response: { success: boolean, data: { user: User, token: string } }

POST /api/auth/login
Body: { email: string, password: string }
Response: { success: boolean, data: { user: User, token: string } }

POST /api/auth/logout
Headers: Authorization: Bearer <token>
Response: { success: boolean }
```

#### Dashboard/Stats Endpoint
```
GET /api/user/stats
Headers: Authorization: Bearer <token>
Response: {
  success: boolean,
  data: {
    totalPoints: number,
    currentStreak: number,
    weeklyPoints: number,
    monthlyPoints: number,
    rank: number,
    recentActivities: Activity[],
    weeklyProgress: Array<{ day: string, points: number }>
  }
}
```

#### User Profile Endpoint
```
GET /api/user/profile
Headers: Authorization: Bearer <token>
Response: {
  success: boolean,
  data: {
    id: string,
    name: string,
    email: string,
    totalPoints: number,
    createdAt: string
  }
}
```

### 📝 Response Type Definitions

See `src/types/index.ts` for complete TypeScript type definitions that your backend should match.

### 🚀 Setup Instructions

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Configure API URL**:
   - Copy `.env.example` to `.env`
   - Update `VITE_API_BASE_URL` with your backend URL
   ```
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

### 🎨 How It Works

1. User visits the app → redirected to `/login` if not authenticated
2. User logs in → API call to `/api/auth/login` → receives token
3. Token stored in localStorage
4. User redirected to `/dashboard`
5. Dashboard loads → API call to `/api/user/stats` with auth token
6. Stats displayed with charts and activity feed

### 🔐 Authentication Flow

- Login/SignUp stores JWT token in `localStorage` as `authToken`
- All API requests automatically include token in `Authorization` header
- If API returns 401, user is automatically logged out and redirected to login

### 📊 Sample Backend Response

Here's an example response your backend should return for `GET /api/user/stats`:

```json
{
  "success": true,
  "data": {
    "totalPoints": 1250,
    "currentStreak": 7,
    "weeklyPoints": 350,
    "monthlyPoints": 980,
    "rank": 42,
    "recentActivities": [
      {
        "id": "act123",
        "userId": "user456",
        "activityType": {
          "id": "type1",
          "name": "Biked to School",
          "description": "Used bicycle instead of car",
          "points": 50,
          "category": "Transportation"
        },
        "points": 50,
        "category": "Transportation",
        "createdAt": "2025-11-05T10:30:00Z"
      }
    ],
    "weeklyProgress": [
      { "day": "Mon", "points": 50 },
      { "day": "Tue", "points": 75 },
      { "day": "Wed", "points": 60 },
      { "day": "Thu", "points": 85 },
      { "day": "Fri", "points": 40 },
      { "day": "Sat", "points": 20 },
      { "day": "Sun", "points": 20 }
    ]
  }
}
```

### 🛠️ Future Endpoints (Placeholders Added)

The API service includes placeholder methods for future PRs:
- `POST /api/activities` - Log new activity
- `GET /api/activity-types` - Get available activity types
- `GET /api/activities/history` - Get activity history
- `GET /api/leaderboard/global` - Global leaderboard
- `GET /api/challenges/active` - Active challenges
- `GET /api/user/badges` - User badges

### 🧪 Testing Without Backend

To test the UI without a backend:
1. Comment out the API call in Dashboard.tsx
2. Use mock data directly in the component
3. Or set up a mock API using tools like JSON Server or MSW

### 📁 File Structure
```
src/
├── services/
│   └── api.ts           # API service with all endpoints
├── types/
│   └── index.ts         # TypeScript type definitions
├── pages/
│   ├── Dashboard.tsx    # Main dashboard component
│   ├── Dashboard.css    # Dashboard styles
│   ├── Login.tsx        # Login page with API integration
│   ├── SignUp.tsx       # Sign up page with API integration
│   ├── Auth.css         # Shared auth page styles
│   ├── Home.tsx         # Landing page
│   └── Home.css         # Landing page styles
└── App.tsx              # Router setup with protected routes
```

### 🎯 Next Steps

After backend implements these endpoints:
1. Test login/signup flow
2. Verify dashboard loads with real data
3. Test authentication token refresh/expiry
4. Add loading states and better error handling
5. Create Activity Logging page (next PR)
6. Create Leaderboard page
7. Create Challenges page
8. Create Badges page
