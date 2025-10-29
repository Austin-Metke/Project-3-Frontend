import { Link, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import Signup from './pages/SignUp'

function Home() {
  const [count, setCount] = useState(0)
  return (
    <>
      <h1>Home</h1>
      <p>This is your starter page. Counter demo:</p>
      <button onClick={() => setCount(c => c + 1)}>count is {count}</button>
    </>
  )
}

export default function App() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: 16 }}>
      {/* simple nav */}
      <header style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid #ddd' }}>
        <Link to="/">Home</Link>
        <Link to="/login">Login</Link>
        <Link to="/signup">Sign Up</Link>
      </header>

      <main style={{ paddingTop: 16 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<p>404 — Not Found</p>} />
        </Routes>
      </main>
    </div>
  )
}
