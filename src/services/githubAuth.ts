import { GITHUB_CONFIG } from '../config/github'

interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  name: string | null
  email: string | null
  bio: string | null
}

class GitHubAuthService {
  /**
   * Redirects user to GitHub OAuth authorization page
   */
  initiateLogin() {
    const { clientId, redirectUri, scope } = GITHUB_CONFIG
    
    // Generate random state for CSRF protection
    const state = this.generateRandomString(32)
    sessionStorage.setItem('github_oauth_state', state)
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scope,
      state: state,
    })
    
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`
  }

  /**
   * Handles the OAuth callback from GitHub
   * Note: In production, you should exchange the code on your backend
   * For now, we'll use GitHub's web flow (less secure but works without backend)
   */
  async handleCallback(code: string, state: string): Promise<GitHubUser> {
    // Verify state to prevent CSRF
    const savedState = sessionStorage.getItem('github_oauth_state')
    if (state !== savedState) {
      throw new Error('Invalid state parameter - possible CSRF attack')
    }
    sessionStorage.removeItem('github_oauth_state')

    // ⚠️ IMPORTANT: This is a simplified flow for demo purposes
    // In production, you should:
    // 1. Send the code to YOUR backend
    // 2. Your backend exchanges code for token with GitHub
    // 3. Your backend returns user data and creates a session
    
    // For now, we'll fetch user data directly using the code
    // and store it in localStorage
    
    // Frontend-only fallback: we cannot exchange the code for an access token
    // without a backend (client secret is required). For now, store a mock
    // authenticated session so the UI flow works. Replace this with a backend
    // call when your server is ready.
    const mockUser: GitHubUser = {
      login: 'github-user',
      id: Date.now(),
      avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4',
      name: 'GitHub User',
      email: null,
      bio: null,
    }

    localStorage.setItem('authToken', `github-${code}`)
    localStorage.setItem('user', JSON.stringify({
      id: `github-${mockUser.id}`,
      name: mockUser.name || mockUser.login,
      email: mockUser.email || `${mockUser.login}@users.noreply.github.com`,
      avatar: mockUser.avatar_url,
      provider: 'github',
    }))

    return mockUser
  }

  /**
   * Generate random string for state parameter
   */
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken')
  }

  /**
   * Get stored user info
   */
  getUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  /**
   * Logout user
   */
  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }
}

export default new GitHubAuthService()
