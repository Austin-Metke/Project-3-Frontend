import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import apiService from '../services/api'
import './Auth.css'

export default function SignUp() {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      await apiService.signUp({ name, email, password })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Demo mode - bypass API for testing
  function handleDemoSignUp() {
    // Create a fake auth token for demo
    localStorage.setItem('authToken', 'demo-token-12345')
    localStorage.setItem('user', JSON.stringify({
      id: 'demo-user',
      name: name || 'Demo User',
      email: email || 'demo@ecopoints.com',
      totalPoints: 0
    }))
    navigate('/dashboard-preview')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🌱 Join EcoPoints</h1>
        <p className="auth-subtitle">Create your account and start making an impact</p>

        <div className="info-banner">
          ℹ️ Backend not connected yet? Use <strong>Demo Mode</strong> to explore the UI!
        </div>

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

          <button 
            type="button"
            className="btn-demo" 
            onClick={handleDemoSignUp}
          >
            🎨 Try Demo Mode (No Backend Required)
          </button>

          <div className="auth-footer">
            <p>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
