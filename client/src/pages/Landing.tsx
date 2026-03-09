import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export function LandingPage() {
  const { isAuthenticated } = useAuth()

  return (
    <main className="landing-page">
      <section className="landing-panel panel-surface">
        <p className="badge badge--neutral">Aegis Hackathon Platform</p>
        <h1 className="landing-title">Daily challenges. Track progress. Compete and collaborate.</h1>
        <p className="landing-copy">
          Tackle daily coding challenges, submit your solutions, and track your progress
          throughout the event. Coordinators monitor submissions and participation in real time.
        </p>
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
      </section>

      <section className="landing-grid">
        <article className="card">
          <h2>Daily challenge calendar</h2>
          <p>New challenges unlock each morning. Track which days you have completed and maintain your streak.</p>
        </article>
        <article className="card">
          <h2>Submit from anywhere</h2>
          <p>Write and submit solutions on any device. Your progress stays with you wherever you work.</p>
        </article>
        <article className="card">
          <h2>Coordinator dashboards</h2>
          <p>Review submissions, monitor participation trends, and manage the event from a single view.</p>
        </article>
      </section>
    </main>
  )
}
