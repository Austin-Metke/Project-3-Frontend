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
      // Backend expects password in 'passwordHash'
      const result = await apiService.signUp({ name, email, passwordHash: password } as any)

      // If backend returns a user object without a token, attempt to log in automatically
      const token = result?.token ?? localStorage.getItem('authToken')
      if (token) {
        setNotification({ message: 'Account created', type: 'success' })
        setTimeout(() => navigate('/dashboard'), 600)
        return
      }

      if (result?.user) {
        // Try to login using the same credentials to establish a session or retrieve token
        try {
          const loginRes = await apiService.login({ name, passwordHash: password } as any)
          const loginToken = loginRes?.token ?? localStorage.getItem('authToken')
          if (loginToken || loginRes?.user) {
            setNotification({ message: 'Account created and signed in', type: 'success' })
            setTimeout(() => navigate('/dashboard'), 600)
            return
          }
        } catch (loginErr) {
          // If auto-login fails, still treat signup as success but inform user to sign in
          setNotification({ message: 'Account created — please sign in', type: 'success' })
          setTimeout(() => navigate('/login'), 800)
          return
        }
      }

      setError('Sign up succeeded but server did not return a user or token. Please check backend behavior.')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign up failed. Please try again.'
      setError(msg)
      setNotification({ message: msg, type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🌱 Join EcoPoints</h1>
        <p className="auth-subtitle">Create your account and start making an impact</p>

        

        {error && (
          <div className="error-banner">
            ⚠️ {error}
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
