# GitHub Login Information Gathered

## What Information Is Collected

When you log in with GitHub, the frontend attempts to gather the following from your GitHub profile:

### Primary Information (from `/api/user` endpoint):
- **Login username** — Your GitHub username (e.g., `octocat`)
- **ID** — Your GitHub user ID (numeric)
- **Avatar URL** — Link to your GitHub avatar image
- **Name** — Your full name (if set in GitHub profile)
- **Email** — Your GitHub email (public or primary)
- **Bio** — Your GitHub bio (if set)

### Secondary Information (from `/api/user/emails` endpoint):
- **Primary verified email** — Your primary verified email address on GitHub
- **Other emails** — Additional emails associated with your account

## Current Status

### ✅ Information Being Stored in Frontend:
```json
{
  "id": "github-{your-github-id}",
  "name": "Your Name or Username",
  "email": "your@email.com",
  "avatar": "https://avatars.githubusercontent.com/u/...",
  "provider": "github"
}
```

### ⚠️ Why You're Seeing "GitHub User"

If you see "GitHub User" as your name, it means the profile fetch from GitHub's API failed (likely due to):
- CORS restrictions
- Invalid/expired OAuth token
- Network connectivity issue
- GitHub API being unreachable

In this case, the frontend falls back to creating a temporary mock user with a generic name.

## How to Fix This

**Option 1: Use the Backend (Recommended)**
The OAuth code should be sent to your backend server, which can:
1. Exchange the code for a real access token (using your Client Secret)
2. Fetch your actual GitHub profile data
3. Create/update your user in the database
4. Return user info to the frontend

**Option 2: Enable GitHub API Access in Frontend**
Currently blocked by CORS policy. To enable, GitHub would need to:
- Allow browser requests from `localhost:5173`
- Or have a proxy/backend handle the API calls

## Next Steps

1. **Check browser console** (F12) for detailed error logs showing why the profile fetch failed
2. **Contact backend team** to implement GitHub OAuth code exchange
3. **Backend endpoint needed**: `POST /auth/github` to exchange code for real user data

## Security Note

⚠️ Never expose your GitHub Client Secret in frontend code. OAuth token exchange must happen on your backend server.
