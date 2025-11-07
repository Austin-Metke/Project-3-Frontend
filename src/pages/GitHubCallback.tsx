import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import githubAuthService from '../services/githubAuth'
import './Auth.css'

export default function GitHubCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    handleCallback()
  }, [])

  async function handleCallback() {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    // Check for errors from GitHub
    if (errorParam) {
      setError('GitHub authentication was cancelled or failed')
      setLoading(false)
      return
    }

    if (!code || !state) {
      setError('Invalid callback parameters')
      setLoading(false)
      return
    }

    try {
      // ⚠️ BACKEND INTEGRATION POINT
      // When backend is ready, replace this with:
      // await apiService.githubCallback({ code, state })
      
      await githubAuthService.handleCallback(code, state)
      
      // Redirect to dashboard on success
      navigate('/dashboard-preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
      setLoading(false)
    }
  }

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
