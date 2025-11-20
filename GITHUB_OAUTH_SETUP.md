# GitHub OAuth Setup Instructions

## Quick Start

GitHub OAuth has been integrated into the login page! Here's how to set it up:

## Step 1: Create a GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click **"New OAuth App"**
3. Fill in the form:
   - **Application name**: EcoPoints (or whatever you prefer)
   - **Homepage URL**: `http://localhost:5173`
   - **Authorization callback URL**: `http://localhost:5173/auth/github/callback`
4. Click **"Register application"**
5. Copy your **Client ID**

## Step 2: Configure Your App

1. Create a `.env` file in the project root:
```bash
touch .env
```

2. Add your GitHub Client ID to `.env`:
```env
VITE_GITHUB_CLIENT_ID=your_client_id_here
VITE_GITHUB_REDIRECT_URI=http://localhost:5173/auth/github/callback
```

3. Restart your dev server:
```bash
npm run dev
```

## Step 3: Test It Out!

1. Go to the login page: `http://localhost:5173/login`
2. Click the **"Sign in with GitHub"** button
3. Authorize the app on GitHub
4. You'll be redirected back and signed in!

## How It Works

### Current Implementation (Frontend Only)
- User clicks "Sign in with GitHub"
- Redirects to GitHub for authorization
- GitHub redirects back with an auth code
- Frontend stores user info in `localStorage`
- No backend required for now!

### When Backend is Connected
You'll need to update these files:
1. `src/services/githubAuth.ts` - Line 51: Send code to your backend
2. `src/pages/GitHubCallback.tsx` - Line 33: Use backend API endpoint

Your backend will:
- Receive the OAuth code
- Exchange it for an access token (with your client secret)
- Create/update user in database
- Return a session token to the frontend

## Files Created

- `src/config/github.ts` - GitHub OAuth configuration
- `src/services/githubAuth.ts` - GitHub authentication service
- `src/pages/GitHubCallback.tsx` - OAuth callback handler
- `src/pages/Login.tsx` - Updated with GitHub sign-in button
- `src/pages/Auth.css` - Updated with GitHub button styles
- `src/App.tsx` - Added callback route

## Security Notes

⚠️ **Important**: This is a simplified implementation for demo purposes.

- User data is stored in `localStorage` (temporary)
- In production, your backend should handle the OAuth flow
- Never expose your GitHub Client Secret in frontend code
- The current implementation doesn't include token refresh

## Troubleshooting

**"Invalid callback URL"** 
- Make sure your GitHub OAuth App callback URL is exactly: `http://localhost:5173/auth/github/callback`

**"Client ID not found"**
- Make sure you created the `.env` file with `VITE_GITHUB_CLIENT_ID`
- Restart your dev server after adding the `.env` file

**"Authentication failed"**
- Check the browser console for errors
- Make sure you're using the correct Client ID
- Try re-authorizing the app in GitHub settings

## Next Steps

When you're ready to connect your backend:
1. Share the OAuth code with your backend team
2. They'll create endpoints for token exchange
3. Update the marked integration points in the code
4. Test the full flow!

Happy coding! 🚀
