import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import './Auth.css'

export default function GitHubCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      const code = searchParams.get('code')
      const state = searchParams.get('state')
      const token = searchParams.get('token')
      const errorParam = searchParams.get('error')

      // Check for errors from GitHub
      if (errorParam) {
        if (!mounted) return
        setError('GitHub authentication was cancelled or failed')
        setLoading(false)
        return
      }

      // Backend-managed OAuth may redirect with a token
      if (token) {
        localStorage.setItem('authToken', token)
        // Optionally fetch user profile here when backend exposes /auth/me
        navigate('/dashboard')
        return
      }

      if (!code || !state) {
        if (!mounted) return
        setError('Invalid callback parameters')
        setLoading(false)
        return
      }

      try {
        // GitHub OAuth exchange - backend doesn't have this endpoint yet
        // For now, redirect to login with an error message
        setError('GitHub OAuth is not yet implemented on the backend')
        setTimeout(() => navigate('/login'), 3000)
      } catch (err) {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'Authentication failed')
      } finally {
        if (mounted) setLoading(false)
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
