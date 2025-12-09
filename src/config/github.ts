export const GITHUB_CONFIG = {
  clientId: import.meta.env.VITE_GITHUB_CLIENT_ID || 'YOUR_GITHUB_CLIENT_ID',
  redirectUri: import.meta.env.VITE_GITHUB_REDIRECT_URI || `${window.location.origin}/auth/github/callback`,
  scope: 'read:user user:email',
}
