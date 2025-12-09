# GitHub OAuth – Backend Implementation Guide

## Minimal Requirements
- Endpoint: `POST /auth/oauth/github`
- Request body (JSON): `{ "code": "<github_oauth_code_from_callback>" }`
- Response (JSON, any of these accepted by frontend):
  - `{ "user": { ... }, "token": "<jwt or session token>" }`
  - `{ "token": "<jwt>", "user": { ... } }`
  - `{ "user": { ... } }` (token optional)
- CORS: Allow POST from the frontend origin (dev: `http://localhost:5173`) and send proper preflight/credential headers.

## GitHub App Settings
- Authorization callback URL: `http://localhost:5173/auth/github/callback`
- Scopes: `read:user user:email`
- Obtain from GitHub: **Client ID** and **Client Secret**.

## Server-Side Flow (recommended)
1) Receive `{ code }` on `POST /auth/oauth/github`.
2) Exchange code for token (server-to-server; do NOT expose client secret to browser):
   - URL: `https://github.com/login/oauth/access_token`
   - Method: POST
   - Headers: `Accept: application/json`
   - Body (form or JSON):
     - `client_id`: your GitHub Client ID
     - `client_secret`: your GitHub Client Secret
     - `code`: the code from the callback
     - `redirect_uri`: `http://localhost:5173/auth/github/callback` (must match the GitHub app setting)
3) From the response, read `access_token`.
4) Fetch profile:
   - GET `https://api.github.com/user` with header `Authorization: Bearer <access_token>` and `Accept: application/vnd.github+json`
5) Fetch primary email (optional but preferred):
   - GET `https://api.github.com/user/emails` with the same auth header; pick the primary verified email.
6) Create or update the user in your DB; generate your own session/JWT token.
7) Return JSON with user (+ token if you issue one).

## Response Shape Examples (all accepted by the frontend)
```json
// Option A
{ "token": "<jwt>", "user": { "id": 123, "name": "Alice", "email": "alice@example.com", "avatar": "https://..." } }

// Option B
{ "user": { "id": 123, "name": "Alice", "email": "alice@example.com", "avatar": "https://..." } }
```
- The frontend stores `token` in `localStorage.authToken` if present.
- The frontend stores `user` as-is in `localStorage.user`.

## Frontend Expectations / Tolerance
- Path: currently calling `POST /auth/oauth/github` (can be changed if needed).
- Accepts tokens in any of these fields: `token`, `accessToken`, `jwt`, `authToken`.
- Accepts user in: `user`, `profile`, or `account`; or as the top-level response body.
- If you wrap in `{ data: ... }`, it will unwrap automatically.

## CORS Checklist
- OPTIONS preflight for `/auth/oauth/github` should return:
  - `Access-Control-Allow-Origin: http://localhost:5173`
  - `Access-Control-Allow-Methods: POST, OPTIONS`
  - `Access-Control-Allow-Headers: Content-Type, Authorization`
  - `Access-Control-Allow-Credentials: true` (if you use cookies; frontend currently uses tokens/localStorage)
- If using cookies/sessions, also set `withCredentials: true` on responses; frontend axios is already configured for token headers, not cookies.

## Sample cURL (backend self-test)
```bash
# 1) Exchange code for token
curl -X POST https://github.com/login/oauth/access_token \
  -H "Accept: application/json" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=CODE_FROM_CALLBACK" \
  -d "redirect_uri=http://localhost:5173/auth/github/callback"

# 2) Fetch profile
curl -H "Authorization: Bearer <access_token>" -H "Accept: application/vnd.github+json" https://api.github.com/user

# 3) Fetch emails (optional)
curl -H "Authorization: Bearer <access_token>" -H "Accept: application/vnd.github+json" https://api.github.com/user/emails
```

## Minimal Pseudo-Handler (Node/Express-style)
```js
app.post('/auth/oauth/github', async (req, res) => {
  const { code } = req.body || {}
  if (!code) return res.status(400).json({ message: 'Missing code' })

  // 1) exchange code for token
  const tokenResp = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: 'http://localhost:5173/auth/github/callback',
    })
  })
  const tokenJson = await tokenResp.json()
  const accessToken = tokenJson.access_token
  if (!accessToken) return res.status(401).json({ message: 'GitHub token exchange failed', detail: tokenJson })

  // 2) fetch profile
  const profileResp = await fetch('https://api.github.com/user', {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
  })
  const profile = await profileResp.json()

  // 3) fetch primary email (optional)
  let email = profile.email || null
  try {
    const emailsResp = await fetch('https://api.github.com/user/emails', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/vnd.github+json' }
    })
    if (emailsResp.ok) {
      const emails = await emailsResp.json()
      const primary = Array.isArray(emails) ? emails.find(e => e.primary && e.verified) : null
      email = primary?.email || email
    }
  } catch {}

  // 4) upsert your user in DB, issue your token
  const user = {
    id: profile.id,
    name: profile.name || profile.login,
    email: email || `${profile.login}@users.noreply.github.com`,
    avatar: profile.avatar_url,
    provider: 'github'
  }
  const token = createJwtFor(user) // your implementation

  return res.json({ token, user })
})
```

## Why the frontend falls back to "GitHub User"
- Browser-based token exchange is blocked by GitHub CORS.
- Because `/auth/oauth/github` is missing, the frontend can’t get a real access token/profile, so it creates a mock user.

Implementing `POST /auth/oauth/github` as above will give the frontend your real GitHub name/email/avatar automatically—no further frontend changes required.
