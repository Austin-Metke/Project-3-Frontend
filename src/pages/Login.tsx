import { useState } from 'react'


export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: call your backend login endpoint
    alert(`Login with ${email} / ${password}`)
  }

  return (
    <section>
      <h1>Log in</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <label>
          <div>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </label>

        <label>
          <div>Password</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </label>

        <button type="submit" style={{ padding: '8px 12px' }}>Sign in</button>
      </form>
    </section>
  )
}

