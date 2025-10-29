import { useState } from 'react'

export default function Signup() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      alert('Passwords do not match')
      return
    }
    // TODO: call your backend signup endpoint
    alert(`Create account for ${name} (${email})`)
  }

  return (
    <section>
      <h1>Create account</h1>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
        <label>
          <div>Name</div>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </label>

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
            minLength={8}
            style={{ width: '100%', padding: 8 }}
          />
        </label>

        <label>
          <div>Confirm password</div>
          <input
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            minLength={8}
            style={{ width: '100%', padding: 8 }}
          />
        </label>

        <button type="submit" style={{ padding: '8px 12px' }}>Create account</button>
      </form>
    </section>
  )
}
