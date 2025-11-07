// GitHub OAuth Configuration
// You'll need to create a GitHub OAuth App at: https://github.com/settings/developers

export const GITHUB_CONFIG = {
  clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID',
  // Prefer env var, otherwise derive from current origin for local dev
  redirectUri: import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/auth/github/callback`,
  scope: 'read:user user:email',
}

// Note: For production, create a GitHub OAuth App:
// 1. Go to https://github.com/settings/developers
// 2. Click "New OAuth App"
// 3. Set Authorization callback URL to: http://localhost:5173/auth/github/callback
// 4. Copy the Client ID and create a .env file with: VITE_GITHUB_CLIENT_ID=your_client_id
