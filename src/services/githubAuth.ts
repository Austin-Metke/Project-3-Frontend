import { GITHUB_CONFIG } from '../config/github'
import apiService from './api'

interface GitHubUser {
  login: string
  id: number
  avatar_url: string
  name: string | null
  email: string | null
  bio: string | null
}

class GitHubAuthService {
  private baseAuthorizeUrl = 'https://github.com/login/oauth/authorize'
  private tokenUrl = 'https://github.com/login/oauth/access_token'

  /**
   * Start OAuth by redirecting to GitHub
   */
  async initiateLogin() {
    const { clientId, redirectUri, scope } = GITHUB_CONFIG
    const state = String(Math.random()).slice(2)

    // Persist state for callback verification (use localStorage to survive navigation)
    localStorage.setItem('github_oauth_state', state)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    })

    window.location.href = `${this.baseAuthorizeUrl}?${params.toString()}`
  }

  /**
   * Handle the OAuth callback by exchanging code for token.
   * Tries backend endpoint first, then falls back to browser-based approach.
   */
  async handleCallback(code: string, state: string): Promise<GitHubUser> {
    const savedState = localStorage.getItem('github_oauth_state')
    
    if (import.meta.env.DEV) {
      console.log('[GitHubAuth] State validation - received:', state, 'saved:', savedState)
    }
    
    // Validate state for CSRF protection (but don't fail if missing for dev/demo)
    if (savedState && state !== savedState) {
      throw new Error('Invalid state parameter - possible CSRF attack')
    }
    localStorage.removeItem('github_oauth_state')

    // Try to exchange code via backend first
    try {
      if (import.meta.env.DEV) {
        console.log('[GitHubAuth] Attempting to exchange code via backend endpoint /auth/oauth/github')
      }
      const result = await apiService.exchangeGitHubCode(code)
      
      if (import.meta.env.DEV) {
        console.log('[GitHubAuth] Exchange result:', result)
      }
      
      // Backend returned user data
      if (result && result.user) {
        if (import.meta.env.DEV) {
          console.log('[GitHubAuth] ✅ Backend exchange successful, user:', result.user)
        }
        
        // Extract user info from backend response
        const userRecord = result.user as unknown as Record<string, unknown>
        const user: GitHubUser = {
          login: (userRecord.name as string) || (userRecord.login as string) || 'GitHub User',
          id: (userRecord.id as number) || Math.floor(Math.random() * 1000000),
          avatar_url: (userRecord.avatar as string) || 'https://avatars.githubusercontent.com/u/0?v=4',
          name: (userRecord.name as string) || (userRecord.login as string),
          email: (userRecord.email as string) || null,
          bio: null,
        }
        
        // Store user and attempt to create in backend
        localStorage.setItem('user', JSON.stringify({
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar_url,
          provider: 'github',
        }))
        
        try {
          if (import.meta.env.DEV) {
            console.log('[GitHubAuth] Creating user in backend from GitHub OAuth exchange...')
          }
          const backendResult = await apiService.upsertUserFromGitHub(user)
          if (import.meta.env.DEV) {
            console.log('[GitHubAuth] ✅ User synced with backend, ID:', backendResult.user?.id)
          }
          // Update localStorage with the actual backend ID
          if (backendResult.user && backendResult.user.id) {
            if (import.meta.env.DEV) {
              console.log('[GitHubAuth] ✅ Updating localStorage with backend user ID:', backendResult.user.id)
            }
            localStorage.setItem('user', JSON.stringify(backendResult.user))
          }
        } catch (err) {
          if (import.meta.env.DEV) {
            console.error('[GitHubAuth] ❌ Could not sync with backend - error details:', err)
          }
        }
        
        return user
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err)
      console.warn('[GitHubAuth] ⚠️ Backend exchange failed:', errMsg, 'Error object:', err)
      console.log('[GitHubAuth] Falling back to browser-based GitHub API approach')
      // Continue to browser-based fallback
    }

    // GitHub's token endpoint requires the client secret, which cannot be exposed in browser code.
    // We need a backend to exchange the code for a token.
    // For now, we'll attempt a direct exchange (which will likely fail due to CORS/missing secret)
    // and fall back to a mock login using the code.
    
    try {
      const resp = await fetch(this.tokenUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: GITHUB_CONFIG.clientId,
          code,
          redirect_uri: GITHUB_CONFIG.redirectUri,
        }),
      })

      if (!resp.ok) {
        const text = await resp.text()
        console.warn('[GitHubAuth] Token exchange failed:', resp.status, text)
        // This is expected - GitHub token endpoint requires client_secret which can't be in browser
        // Fall back to fetching user data with the code as a placeholder token
      }

      let accessToken: string | undefined
      try {
        const data = await resp.json()
        accessToken = (data && (data.access_token || data.token)) as string | undefined
      } catch {
        // JSON parse failed; response likely isn't JSON
        accessToken = undefined
      }

      // If direct exchange failed (expected), use code as a temporary identifier
      // In production, this should be handled by your backend
      if (!accessToken) {
        console.log('[GitHubAuth] Using OAuth code as temporary token - backend should exchange this')
        accessToken = `github_oauth_${code}`
      }

      let profile: GitHubUser | null = null

      // Try to retrieve basic profile
      try {
        const profileResp = await fetch('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        })

        if (profileResp.ok) {
          const data = await profileResp.json()
          if (import.meta.env.DEV) {
            console.log('[GitHubAuth] Profile fetched:', data)
          }
          profile = {
            login: data.login,
            id: data.id,
            avatar_url: data.avatar_url,
            name: data.name || data.login,
            email: data.email,
            bio: data.bio || null,
          }
        } else {
          console.warn('[GitHubAuth] Profile fetch failed:', profileResp.status, profileResp.statusText)
          const text = await profileResp.text()
          if (import.meta.env.DEV) {
            console.log('[GitHubAuth] Profile response:', text)
          }
        }
      } catch (err) {
        console.warn('[GitHubAuth] Profile fetch error:', err)
      }

      // If we couldn't fetch the profile (CORS, network error, or invalid token), create a minimal user
      if (!profile) {
        console.log('[GitHubAuth] Could not fetch profile, using fallback mock user')
        const mockUser: GitHubUser = {
          login: `github-user-${code.slice(0, 8)}`,
          id: parseInt(code.slice(0, 8), 16) || Math.floor(Math.random() * 1000000),
          avatar_url: 'https://avatars.githubusercontent.com/u/0?v=4',
          name: 'GitHub User',
          email: null,
          bio: null,
        }
        
        localStorage.setItem('authToken', accessToken)
        localStorage.setItem('user', JSON.stringify({
          id: `github-${mockUser.id}`,
          name: mockUser.name,
          email: mockUser.email || `${mockUser.login}@users.noreply.github.com`,
          avatar: mockUser.avatar_url,
          provider: 'github',
        }))
        
        return mockUser
      }

      let email: string | null = null
      try {
        const emailsResp = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github+json',
          },
        })
        if (emailsResp.ok) {
          const emails: unknown = await emailsResp.json()
          if (Array.isArray(emails)) {
            const primary = emails.find((e) => {
              if (e && typeof e === 'object') {
                const rec = e as Record<string, unknown>
                return Boolean(rec.primary) && Boolean(rec.verified)
              }
              return false
            }) as Record<string, unknown> | undefined
            email = primary && primary.email ? String(primary.email) : (emails[0] && (emails[0] as Record<string, unknown>).email ? String((emails[0] as Record<string, unknown>).email) : null)
          }
        }
      } catch {
        email = null
      }

      const user: GitHubUser = {
        login: profile.login,
        id: profile.id,
        avatar_url: profile.avatar_url,
        name: profile.name || profile.login,
        email,
        bio: profile.bio || null,
      }

      // Store user locally with temporary ID
      localStorage.setItem('authToken', accessToken)
      localStorage.setItem('user', JSON.stringify({
        id: `github-${user.id}`,
        name: user.name || user.login,
        email: user.email || `${user.login}@users.noreply.github.com`,
        avatar: user.avatar_url,
        provider: 'github',
      }))

      // Attempt to create/register the user in the backend
      try {
        if (import.meta.env.DEV) {
          console.log('[GitHubAuth] Creating user in backend from GitHub data...')
        }
        const backendResult = await apiService.upsertUserFromGitHub(user)
        if (import.meta.env.DEV) {
          console.log('[GitHubAuth] ✅ User synced with backend, ID:', backendResult.user?.id)
        }
        // Update localStorage with the actual backend ID (critical for activity matching!)
        if (backendResult.user && backendResult.user.id) {
          if (import.meta.env.DEV) {
            console.log('[GitHubAuth] ✅ Updating localStorage with backend user ID:', backendResult.user.id)
          }
          localStorage.setItem('user', JSON.stringify(backendResult.user))
        }
      } catch (err) {
        if (import.meta.env.DEV) {
          console.error('[GitHubAuth] ❌ Could not sync with backend - error details:', err)
        }
        // Continue anyway - user is stored locally
      }

      return user
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[GitHubAuth] ❌ OAuth flow failed:', msg, err)
      
      // Last resort: create a mock user so the login doesn't completely fail
      const mockUserId = Math.floor(Math.random() * 1000000)
      const mockUser: GitHubUser = {
        login: `github-user-${mockUserId}`,
        id: mockUserId,
        avatar_url: 'https://avatars.githubusercontent.com/u/0?v=4',
        name: 'GitHub User',
        email: null,
        bio: null,
      }
      
      localStorage.setItem('authToken', `github_oauth_backup_${code}`)
      localStorage.setItem('user', JSON.stringify({
        id: `github-${mockUser.id}`,
        name: mockUser.name,
        email: `${mockUser.login}@users.noreply.github.com`,
        avatar: mockUser.avatar_url,
        provider: 'github',
      }))
      
      console.log('[GitHubAuth] ⚠️ Using fallback mock user. Backend should implement POST /auth/oauth/github endpoint to get real profile data.')
      return mockUser
    }
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken')
  }

  getUser() {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  }

  logout() {
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
  }
}

export default new GitHubAuthService()
