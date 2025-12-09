import { useNavigate } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">Welcome to EcoPoints</h1>
        <p className="home-subtitle">Track your eco-friendly actions and earn points for making a difference</p>

        <div className="home-buttons">
          <button
            className="btn btn-login"
            onClick={() => navigate('/login')}
          >
            Login
          </button>

          <button
            className="btn btn-signup"
            onClick={() => navigate('/signup')}
          >
            Sign Up
          </button>
        </div>

        <div className="home-features">
          <div className="feature">
            <span className="feature-icon">Pts</span>
            <h3>Earn Points</h3>
            <p>Log eco-friendly activities and watch your points grow</p>
          </div>
          <div className="feature">
            <span className="feature-icon">Stats</span>
            <h3>Track Progress</h3>
            <p>See your impact with detailed stats and charts</p>
          </div>
          <div className="feature">
            <span className="feature-icon">Compete</span>
            <h3>Compete Globally</h3>
            <p>Join leaderboards and challenge your friends</p>
          </div>
        </div>
      </div>
    </div>
  )
}
