import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import apiService from '../services/api'
import './Auth.css'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await apiService.login({ email, password })
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Demo mode - bypass API for testing
  function handleDemoLogin() {
    // Create a fake auth token for demo
    localStorage.setItem('authToken', 'demo-token-12345')
    localStorage.setItem('user', JSON.stringify({
      id: 'demo-user',
      name: 'Demo User',
      email: 'demo@ecopoints.com',
      totalPoints: 1250
    }))
    navigate('/dashboard-preview')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🌱 Log in to EcoPoints</h1>
        <p className="auth-subtitle">Sign in to track your eco-friendly journey</p>

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
            className="btn-demo" 
            onClick={handleDemoLogin}
          >
            🎨 Try Demo Mode (No Backend Required)
          </button>

          <div className="auth-footer">
            <p>
              Don't have an account? <Link to="/signup">Sign up</Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}

