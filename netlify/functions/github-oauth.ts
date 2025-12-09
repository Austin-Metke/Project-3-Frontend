// @ts-nocheck

// Env vars to set in Netlify:
// GITHUB_CLIENT_ID
// GITHUB_CLIENT_SECRET
// REDIRECT_URI (e.g., http://localhost:5173/auth/github/callback or your deployed frontend URL)

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_USER_URL = 'https://api.github.com/user'
const GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'

export const handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return corsResponse(200, { ok: true })
    }
    if (event.httpMethod !== 'POST') {
      return corsResponse(405, { message: 'Method Not Allowed' })
    }

    const body = event.body ? JSON.parse(event.body) : {}
    const code: string | undefined = body.code
    if (!code) {
      return corsResponse(400, { message: 'Missing code' })
    }

    const clientId = process.env.GITHUB_CLIENT_ID
    const clientSecret = process.env.GITHUB_CLIENT_SECRET
    const redirectUri = process.env.REDIRECT_URI || 'http://localhost:5173/auth/github/callback'
    if (!clientId || !clientSecret) {
      return corsResponse(500, { message: 'Server missing GitHub client credentials' })
    }

    // Exchange code for access token
    const tokenResp = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })

    const tokenJson = await tokenResp.json()
    const accessToken = (tokenJson as any)?.access_token as string | undefined
    if (!accessToken) {
      return corsResponse(401, { message: 'GitHub token exchange failed', detail: tokenJson })
    }

    const ghHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    }

    // Fetch profile
    const profileResp = await fetch(GITHUB_USER_URL, { headers: ghHeaders })
    if (!profileResp.ok) {
      return corsResponse(502, { message: 'Failed to fetch GitHub profile', detail: await profileResp.text() })
    }
    const profile = await profileResp.json() as any

    // Fetch primary email (best-effort)
    let email: string | null = profile?.email || null
    try {
      const emailResp = await fetch(GITHUB_EMAILS_URL, { headers: ghHeaders })
      if (emailResp.ok) {
        const emails = await emailResp.json() as any[]
        const primary = Array.isArray(emails) ? emails.find((e) => e?.primary && e?.verified) : null
        email = primary?.email || email || (Array.isArray(emails) && emails[0]?.email) || null
      }
    } catch {
      // ignore
    }

    const user = {
      id: profile.id,
      name: profile.name || profile.login,
      email: email || `${profile.login}@users.noreply.github.com`,
      avatar: profile.avatar_url,
      provider: 'github',
      login: profile.login,
    }

    // If you issue your own JWT/session, generate it here. For minimal drop-in, omit token.
    return corsResponse(200, { user })
  } catch (err) {
    return corsResponse(500, { message: (err as Error).message || 'Internal error' })
  }
}

function corsResponse(statusCode: number, body: unknown) {
  const allowOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:5173'
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': allowOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
}
