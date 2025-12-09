import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GoogleLogin } from '@react-oauth/google'
import apiService from '../services/api'
import googleAuthService from '../services/googleAuth'
import './Auth.css'
import Notification from '../components/Notification'

export default function SignUp() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Validation
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill out all fields.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    setLoading(true)

    try {
      const result = await apiService.signUp({ name, email, password } as any)

      if (result?.user?.id) {
        navigate('/dashboard')
        return
      }

      navigate('/login')
    } catch (err) {
      let msg = 'Sign up failed. Please try again.'
      try {
        const anyErr = err as any
        const serverMsg = anyErr?.response?.data?.message || anyErr?.response?.data?.error || anyErr?.message
        if (typeof serverMsg === 'string' && serverMsg.trim()) msg = serverMsg
        // Specific duplicate email handling
        if (/already\s+registered|duplicate|409/i.test(String(serverMsg))) {
          msg = 'This email is already registered. Please try logging in instead.'
        }
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[SignUp] error response=', anyErr?.response?.status, anyErr?.response?.data)
        }
      } catch {}
      setError(msg)
      setNotification({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSuccess(credentialResponse: any) {
    try {
      setLoading(true)
      await googleAuthService.handleGoogleLogin(credentialResponse)
      navigate('/dashboard')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Google sign up failed'
      setError(msg)
      setNotification({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleError() {
    setError('Google sign up failed')
    setNotification({ message: 'Google sign up failed', type: 'error' })
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Join EcoPoints</h1>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your full name"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your.email@example.com"
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
              placeholder="Create a password (min 6 characters)"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              required
              disabled={loading}
              minLength={6}
            />
          </div>

          <button 
            className="btn-submit" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>

          <div className="divider">
            <span>OR</span>
          </div>

          <div className="google-login-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              text="signup_with"
              shape="rectangular"
              width="280"
            />
          </div>

          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Log in</Link>
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
