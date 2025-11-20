# Testing the EcoPoints Dashboard

## 🎨 Demo Mode (No Backend Required)

Since the backend isn't connected yet, you can use **Demo Mode** to explore the Dashboard UI.

### How to Use Demo Mode:

1. **Start the dev server:**
   ```bash
   npm run dev
   ```

2. **Visit the login page:**
   ```
   http://localhost:5173/login
   ```

3. **Click the "Try Demo Mode" button**
   - This bypasses the API calls
   - Takes you directly to the Dashboard with mock data
   - No email/password needed!

### Alternative: Direct Links

- **Login Page:** http://localhost:5173/login
- **Sign Up Page:** http://localhost:5173/signup
- **Dashboard Preview:** http://localhost:5173/dashboard-preview

### What You Can Test:

✅ **Dashboard Features:**
- Total Points, Streak, Weekly/Monthly Points, Global Rank
- Weekly progress bar chart
- Recent activities list
- Quick action buttons (these show alerts for now)

✅ **Navigation:**
- Landing page (/home)
- Login page with demo mode
- Sign up page with demo mode

## 🔌 With Backend Connected

When your backend is ready:

1. **Update `.env` file:**
   ```
   VITE_API_BASE_URL=http://your-backend-url/api
   ```

2. **Use the regular login:**
   - Enter real credentials
   - API calls will work
   - Dashboard will show real data from `/api/user/stats`

## 📋 Test Accounts

Once backend is connected, you'll need to create test accounts via your backend's registration endpoint.

**For now, use Demo Mode!** 🎨
