import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getAuthClient } from '../lib/neon-auth'

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
      const client = getAuthClient()
      if (mode === 'login') {
        const { error: authError } = await (client as unknown as { signIn: { email: (params: { email: string, password: string }) => Promise<{ error: { message?: string } | null }> } }).signIn.email({ email, password })
        if (authError) throw new Error(authError.message ?? 'Sign in failed')
      } else {
        const { error: authError } = await (client as unknown as { signUp: { email: (params: { email: string, password: string, name: string }) => Promise<{ error: { message?: string } | null }> } }).signUp.email({ email, password, name })
        if (authError) throw new Error(authError.message ?? 'Registration failed')
      }

      await login()
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
