import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../lib/api'

type AuthResponse = {
  user: {
    id: number
    name: string
    email: string
    role: 'participant' | 'admin'
  }
  accessToken: string
  refreshToken: string
}

export function LoginPage() {
  const location = useLocation()
  const initialMode = (location.state as { mode?: string } | null)?.mode === 'register'
    ? 'register'
    : 'login'

  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { isAuthenticated, login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/app', { replace: true })
    }
  }, [isAuthenticated, navigate])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response =
        mode === 'login'
          ? await apiRequest<AuthResponse>('/api/auth/login', {
              method: 'POST',
              body: JSON.stringify({ email, password }),
            })
          : await apiRequest<AuthResponse>('/api/auth/register', {
              method: 'POST',
              body: JSON.stringify({ name, email, password }),
            })

      login(response.accessToken, response.refreshToken)
      setPassword('')
      navigate('/app', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card panel-surface">
        <div className="auth-header">
          <Link className="auth-brand" to="/">Aegis</Link>
          <h1>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h1>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <label>
              Display name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Your name"
                required
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
              minLength={mode === 'register' ? 6 : undefined}
            />
            {mode === 'register' && (
              <span className="caption-text">Minimum 6 characters</span>
            )}
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn primary auth-submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login' ? (
            <>
              No account yet?{' '}
              <button type="button" className="auth-switch-link" onClick={() => { setMode('register'); setError('') }}>
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button type="button" className="auth-switch-link" onClick={() => { setMode('login'); setError('') }}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </main>
  )
}
