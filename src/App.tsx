import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import GitHubCallback from './pages/GitHubCallback'
import { Challenges, Badges } from './pages/DaskboardTabsPages'
import LogActivity from './pages/LogActivity'
import './App.css'
import { BackendStatusProvider } from './contexts/BackendStatusContext'
import BackendStatusBanner from './components/BackendStatusBanner'

// Protected Route component
import { useEffect, useState } from 'react'
import apiService from './services/api'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let mounted = true

    async function verify() {
      const token = localStorage.getItem('authToken')
      const userStr = localStorage.getItem('user')

      // If local auth info exists, treat as authenticated and avoid extra network call.
      if (token || userStr) {
        if (!mounted) return
        setAuthed(true)
        setChecking(false)
        return
      }

      // No local auth info — try verifying server-side session (cookie)
      try {
        await apiService.getUserProfile()
        if (!mounted) return
        setAuthed(true)
      } catch (err) {
        if (!mounted) return
        setAuthed(false)
      } finally {
        if (!mounted) return
        setChecking(false)
      }
    }

    verify()
    return () => { mounted = false }
  }, [])

  if (checking) return null
  if (!authed) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <BackendStatusProvider>
      <BackendStatusBanner />
    <Routes>
      {/* Public Routes */}
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/auth/github/callback" element={<GitHubCallback />} />
      
  {/* Removed mock dashboard - app uses backend-driven /dashboard only */}
      <Route path="/challenges" element={<Challenges />} />
  <Route path="/log-activity" element={<LogActivity />} />
      <Route path="/badges" element={<Badges />} />
      
      {/* Protected Routes */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      
      {/* Catch all - redirect to dashboard */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </BackendStatusProvider>
  )
}

export default App
