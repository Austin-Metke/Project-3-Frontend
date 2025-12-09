import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import githubAuthService from '../services/githubAuth'
import './Auth.css'

export default function GitHubCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const handledRef = useRef(false)

  useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    
    // Only run once per unique code
    if (handledRef.current || !code) return
    handledRef.current = true

    let mounted = true
    ;(async () => {
      const errorParam = searchParams.get('error')

      if (import.meta.env.DEV) {
        console.log('[GitHubCallback] Callback triggered with code:', code?.slice(0, 10), 'state:', state?.slice(0, 10))
      }

      // Check for errors from GitHub
      if (errorParam) {
        if (!mounted) return
        setError('GitHub authentication was cancelled or failed')
        setLoading(false)
        return
      }

      if (!state) {
        if (!mounted) return
        setError('Invalid callback parameters: missing state')
        setLoading(false)
        return
      }

      try {
        // Exchange the code for user profile using githubAuthService
        await githubAuthService.handleCallback(code, state)
        
        if (import.meta.env.DEV) {
          console.log('[GitHubCallback] GitHub authentication successful')
          console.log('[GitHubCallback] localStorage user:', localStorage.getItem('user'))
          console.log('[GitHubCallback] Navigating to /dashboard...')
        }
        
        // Navigate immediately without checking mounted state
        // (navigation will handle cleanup)
        navigate('/dashboard', { replace: true })
      } catch (err) {
        if (!mounted) return
        const msg = err instanceof Error ? err.message : 'Authentication failed'
        setError(msg)
        setLoading(false)
        console.error('[GitHubCallback] Error:', msg, err)
      }
    })()

    return () => { mounted = false }
  }, [navigate, searchParams])

  if (error) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1>Authentication Error</h1>
          <div className="error-banner">
            ⚠️ {error}
          </div>
          <button 
            className="btn-submit" 
            onClick={() => navigate('/login')}
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Authenticating with GitHub...</h1>
        {loading && (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Please wait while we sign you in</p>
          </div>
        )}
      </div>
    </div>
  )
}
