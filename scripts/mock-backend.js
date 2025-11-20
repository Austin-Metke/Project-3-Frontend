// Simple mock backend for local frontend testing
// No dependencies required. Starts an HTTP server on port 3000 and
// serves a small set of endpoints under /api to emulate your backend.

const http = require('http')
const url = require('url')

const PORT = process.env.PORT || 3000

const sampleUser = {
  id: '2',
  name: 'Demo User',
  email: 'demo@ecopoints.com',
  totalPoints: 1250,
}

const challenges = [
  { challengeID: 1, name: '10K Steps a Day', description: 'Walk instead of driving for short trips', points: 100, isCompleted: false, target: 10, progress: 2, userId: 2 },
  { challengeID: 2, name: 'Car-Free Week', description: 'Avoid using your car for one week', points: 80, isCompleted: false, target: 7, progress: 0, userId: 3 },
  { challengeID: 3, name: 'Plant-Based Month', description: 'Eat plant-based meals', points: 120, isCompleted: false, target: 30, progress: 5, userId: 4 },
]

const badges = [
  { id: 'b1', title: '7-Day Streak', description: 'Completed 7-day streak', points: 100 },
  { id: 'b2', title: 'Recycling Champion', description: '10 recycling activities', points: 150 },
]

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj)
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  })
  res.end(body)
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true)
  const pathname = parsed.pathname || ''
  const method = req.method || 'GET'

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    })
    res.end()
    return
  }

  // Basic routing under /api
  if (pathname === '/api/challenges' && method === 'GET') {
    // optional userId query
    const userId = parsed.query.userId
    if (userId) {
      const filtered = challenges.filter(c => String(c.userId) === String(userId))
      return sendJSON(res, 200, filtered)
    }
    return sendJSON(res, 200, challenges)
  }

  if ((pathname === '/api/auth/me' || pathname === '/api/user/profile') && method === 'GET') {
    return sendJSON(res, 200, { success: true, data: sampleUser })
  }

  if (pathname === '/api/auth/oauth/github' && method === 'POST') {
    let body = ''
    req.on('data', chunk => body += chunk)
    req.on('end', () => {
      try {
        const data = body ? JSON.parse(body) : {}
        // Simulate exchange
        const token = 'mock-jwt-token-12345'
        return sendJSON(res, 200, { token, user: sampleUser })
      } catch (err) {
        return sendJSON(res, 400, { message: 'Invalid JSON' })
      }
    })
    return
  }

  if ((pathname === '/api/user/badges' || pathname === '/api/badges') && method === 'GET') {
    return sendJSON(res, 200, badges)
  }

  // Generic 404 for anything else under /api
  if (pathname.startsWith('/api')) {
    return sendJSON(res, 404, { message: 'Not Found' })
  }

  // Root health check
  if (pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/plain' })
    return res.end('Mock backend running')
  }

  // Anything else
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not found')
})

server.listen(PORT, () => {
  console.log(`Mock backend listening on http://localhost:${PORT}`)
})
