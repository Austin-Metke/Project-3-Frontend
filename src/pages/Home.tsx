import { useNavigate } from 'react-router-dom'
import './Home.css'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="home-container">
      <div className="home-content">
        <h1 className="home-title">EcoPoints</h1>
        <p className="home-subtitle">Track your eco-friendly actions and earn points</p>

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
            <h3>Earn Points</h3>
            <p>Log eco-friendly activities</p>
          </div>
          <div className="feature">
            <h3>Track Progress</h3>
            <p>See your stats over time</p>
          </div>
          <div className="feature">
            <h3>Compete</h3>
            <p>Join the leaderboard</p>
          </div>
        </div>
      </div>
    </div>
  )
}
