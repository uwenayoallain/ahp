import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../lib/api'
import { formatShortDate } from '../lib/format'

type ActiveHackathon = {
  name: string
  description: string
  start_date: string
  end_date: string
}

export function LandingPage() {
  const { isAuthenticated, isAuthLoading, userName } = useAuth()
  const [hackathon, setHackathon] = useState<ActiveHackathon | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<ActiveHackathon | null>('/api/hackathons/active', {
          fallbackData: null,
        })
        if (!cancelled) {
          setHackathon(data)
        }
      } catch {
        if (!cancelled) {
          setHackathon(null)
        }
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <main className="landing-page">
      <section className="landing-panel panel-surface">
        <div className="landing-hero">
          <div className="landing-copy-block">
            <div className="badge-row">
              <p className="badge badge--neutral">Aegis Hackathon Platform</p>
              {hackathon && <p className="badge">{`${formatShortDate(hackathon.start_date)} to ${formatShortDate(hackathon.end_date)}`}</p>}
            </div>
            <h1 className="landing-title">
              {isAuthenticated ? 'Continue the active hackathon from one place.' : 'Online hackathon operations, challenge delivery, and team progress in one workspace.'}
            </h1>
            <p className="landing-copy">
              {hackathon?.description ?? 'Track the current event, follow published sessions, open challenge briefs, manage team access, and keep submissions moving without losing context.'}
            </p>
            {isAuthenticated && userName && (
              <p className="landing-status">
                Signed in as {userName}
              </p>
            )}
            {!isAuthenticated && !isAuthLoading && (
              <p className="landing-status">
                Sign in to access the active hackathon workspace, team requests, submissions, and progress tracking.
              </p>
            )}
            <div className="actions">
              {isAuthenticated ? (
                <Link className="btn primary" to="/app">
                  Open Dashboard
                </Link>
              ) : (
                <>
                  <Link className="btn primary" to="/login">
                    Sign In
                  </Link>
                  <Link className="btn secondary" to="/login" state={{ mode: 'register' }}>
                    Create Account
                  </Link>
                </>
              )}
              <Link className="btn secondary" to="/leaderboard">
                View Leaderboard
              </Link>
            </div>
          </div>

          <div className="landing-media">
            <img
              src="/images/homepage-hero.png"
              alt="Online hackathon workspace showing code, challenge panels, and collaboration surfaces"
              className="landing-hero-image"
            />
          </div>
        </div>
      </section>

      <section className="landing-grid">
        <article className="card">
          <h2>Current event visibility</h2>
          <p>See whether the current hackathon is upcoming, live, or completed, with published dates and challenge windows.</p>
        </article>
        <article className="card">
          <h2>Online-only delivery</h2>
          <p>Follow livestreams, workshops, mentor channels, and submission deadlines without depending on a physical venue.</p>
        </article>
        <article className="card">
          <h2>Request-based teams</h2>
          <p>Create your own team or request access to an existing one, with team locks enforced once submissions begin.</p>
        </article>
      </section>
    </main>
  )
}
