import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import DashboardMock from './pages/DashboardMock'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import './App.css'

// Protected Route component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('authToken')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      
      {/* Mock Dashboard - for UI testing without backend */}
      <Route path="/dashboard-preview" element={<DashboardMock />} />
      
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
  )
}

export default App
