import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import apiService from '../services/api'
import githubAuthService from '../services/githubAuth'
import googleAuthService from '../services/googleAuth'
import './Auth.css'
import Notification from '../components/Notification'

export default function Login() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Heroku backend expects { name, email, password }.
      // Since email input is removed, map name to both fields for compatibility.
      const result = await apiService.login({ name, email: name, password } as any)

      if (import.meta.env.DEV) {
        try {
          // eslint-disable-next-line no-console
          console.debug('[Login] login result:', result, 'localStorage user=', localStorage.getItem('user'), 'token=', localStorage.getItem('authToken'))
        } catch {}
      }

      const user = result?.user ?? result
      const token = result?.token ?? localStorage.getItem('authToken')

      if (user || token) {
        navigate('/dashboard')
      } else {
        setError('Login failed: unexpected server response.')
        setNotification({ message: 'Login failed', type: 'error' })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed. Please try again.'
      setError(msg)
      setNotification({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // GitHub OAuth login
  function handleGitHubLogin() {
    githubAuthService.initiateLogin()
  }

  // Google OAuth login
  async function handleGoogleSuccess(credentialResponse: any) {
    try {
      setLoading(true)
      await googleAuthService.handleGoogleLogin(credentialResponse)
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google login failed'
      setError(msg)
      setNotification({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleError() {
    setError('Google login failed')
    setNotification({ message: 'Google login failed', type: 'error' })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Log in to EcoPoints</h1>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Username"
              required
              disabled={loading}
            />
          </div>


          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              disabled={loading}
            />
          </div>

          <button 
            className="btn-submit" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <button 
            type="button"
            className="btn-github" 
            onClick={handleGitHubLogin}
          >
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor" style={{marginRight: '8px'}}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
            </svg>
            Sign in with GitHub
          </button>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              useOneTap
            />
          </div>

          <div className="auth-footer">
            <p>
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
          {notification && (
            <Notification message={notification.message} type={notification.type as any} onClose={() => setNotification(null)} />
          )}
        </form>
      </div>
    </div>
  )
}
