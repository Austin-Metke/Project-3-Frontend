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
  private baseAuthorizeUrl = 'https://github.com/login/oauth/authorize'
  private tokenUrl = 'https://github.com/login/oauth/access_token'

  // PKCE helpers
  private base64UrlEncode(buffer: ArrayBuffer) {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  }

  private async sha256(input: string) {
    const encoder = new TextEncoder()
    const data = encoder.encode(input)
    return crypto.subtle.digest('SHA-256', data)
  }

  private generateCodeVerifier() {
    const array = new Uint8Array(64)
    crypto.getRandomValues(array)
    return this.base64UrlEncode(array.buffer)
  }

  private async computeCodeChallenge(verifier: string) {
    const digest = await this.sha256(verifier)
    return this.base64UrlEncode(digest)
  }

  /**
   * Start OAuth by redirecting to GitHub with PKCE parameters
   */
  async initiateLogin() {
    const { clientId, redirectUri, scope } = GITHUB_CONFIG
    const state = String(Math.random()).slice(2)
    const codeVerifier = this.generateCodeVerifier()
    const codeChallenge = await this.computeCodeChallenge(codeVerifier)

    // Persist verifier and state for callback verification
    sessionStorage.setItem('github_oauth_state', state)
    sessionStorage.setItem('github_oauth_code_verifier', codeVerifier)

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    })

    window.location.href = `${this.baseAuthorizeUrl}?${params.toString()}`
  }

  /**
   * Handle the OAuth callback by exchanging code for token using PKCE.
   * IMPORTANT: GitHub's token endpoint may not allow CORS requests from the browser.
   * If that is the case, this method will fail and you should perform the exchange on a backend.
   */
  async handleCallback(code: string, state: string): Promise<GitHubUser> {
    const savedState = sessionStorage.getItem('github_oauth_state')
    if (state !== savedState) {
      throw new Error('Invalid state parameter - possible CSRF attack')
    }
    sessionStorage.removeItem('github_oauth_state')

    const codeVerifier = sessionStorage.getItem('github_oauth_code_verifier')
    sessionStorage.removeItem('github_oauth_code_verifier')
    if (!codeVerifier) {
      throw new Error('Missing code verifier for PKCE - cannot complete login')
    }

    // Exchange code for access token directly with GitHub
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
          code_verifier: codeVerifier,
        }),
      })

      if (!resp.ok) {
        const text = await resp.text()
        throw new Error(`Token exchange failed: ${resp.status} ${text}`)
      }

      const data = await resp.json()
      const accessToken = (data && (data.access_token || data.token)) as string | undefined
      if (!accessToken) {
        // Likely CORS or server-side restriction — instruct to use backend
        throw new Error('Token exchange did not return an access token. If using GitHub, their token endpoint may block browser requests; use a backend exchange.')
      }

      // Retrieve basic profile
      const profileResp = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github+json',
        },
      })

      if (!profileResp.ok) {
        throw new Error('Failed to fetch GitHub user profile')
      }
      const profile = await profileResp.json()

      // Try to get primary email
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
        // Non-fatal if emails endpoint fails
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

      // Store token and user locally (demo behavior)
      localStorage.setItem('authToken', accessToken)
      localStorage.setItem('user', JSON.stringify({
        id: `github-${user.id}`,
        name: user.name || user.login,
        email: user.email || `${user.login}@users.noreply.github.com`,
        avatar: user.avatar_url,
        provider: 'github',
      }))

      return user
    } catch (err) {
      // Re-throw with a clearer message when CORS or provider restrictions apply
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`${msg}. If this mentions CORS or blocked requests, run the exchange on your backend instead.`)
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
