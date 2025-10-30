// src/App.tsx
import { View, Text, StyleSheet } from 'react-native'
import { Link, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import SignUp from './pages/SignUp'

function Home() {
  const [count, setCount] = useState(0)
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.title}>Home</Text>
      <Text>This is your starter page. Counter demo:</Text>
      <button onClick={() => setCount((c) => c + 1)}>count is {count}</button>
    </View>
  )
}

export default function App() {
  return (
    <View style={styles.root}>
      {/* Simple nav bar */}
      <View style={styles.nav}>
        <Link to="/" style={styles.navLink as any}>Home</Link>
        <Link to="/login" style={styles.navLink as any}>Login</Link>
        <Link to="/signup" style={styles.navLink as any}>Sign Up</Link>
      </View>

      <View style={styles.container}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="*" element={<Text>404 — Not Found</Text>} />
        </Routes>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  nav: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    justifyContent: 'center',
  },
  navLink: {
    fontSize: 16,
    color: '#007AFF',
    textDecorationLine: 'none',
  },
  container: {
    padding: 16,
    maxWidth: 960,
    alignSelf: 'center',
    width: '100%',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
})
