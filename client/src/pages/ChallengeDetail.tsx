import { useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Markdown } from '../components/ui/Markdown'
import { PageHeader } from '../components/ui/PageHeader'
import { formatDateTime } from '../lib/format'
import { useAppStore } from '../stores/app-store'
import type { ChallengeDetail } from '../stores/app-store'

function challengeAvailability(challenge: ChallengeDetail) {
  const now = Date.now()
  const unlockAt = new Date(challenge.unlock_at).getTime()
  const deadlineAt = challenge.submission_deadline_at ? new Date(challenge.submission_deadline_at).getTime() : null

  if (Number.isFinite(unlockAt) && now < unlockAt) {
    return {
      label: 'Locked',
      className: 'badge badge--warning',
      detail: `Opens ${formatDateTime(challenge.unlock_at)}`,
    }
  }

  if (deadlineAt !== null && now > deadlineAt) {
    return {
      label: 'Late window',
      className: 'badge badge--neutral',
      detail: `Deadline passed ${formatDateTime(challenge.submission_deadline_at!)}`,
    }
  }

  return {
    label: 'Open',
    className: 'badge badge--success',
    detail: challenge.submission_deadline_at
      ? `Deadline ${formatDateTime(challenge.submission_deadline_at)}`
      : 'Open for submissions',
  }
}

export function ChallengeDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const fetchChallengeDetail = useAppStore((s) => s.fetchChallengeDetail)
  const entry = useAppStore((s) => s.challengeDetails[slug ?? ''])
  const challenge = entry?.data ?? null
  const loading = entry?.loading ?? true
  const error = entry?.error ?? ''
  const fetchedAt = entry?.fetchedAt ?? 0

  useEffect(() => {
    if (slug) void fetchChallengeDetail(slug)
  }, [slug, fetchChallengeDetail])

  if (loading && fetchedAt === 0) {
    return (
      <>
        <PageHeader title="Challenge" subtitle="" />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error || !challenge) {
    return (
      <>
        <PageHeader title="Challenge" subtitle="" />
        <p className="status-text">{error || 'Challenge not found.'}</p>
        <Link to="/app/challenges" className="btn secondary">Back to challenges</Link>
      </>
    )
  }

  const availability = challengeAvailability(challenge)

  return (
    <>
      <PageHeader
        title={`Day ${challenge.day_number}: ${challenge.title}`}
        subtitle={challenge.summary}
      />

      <div className="badge-row">
        <span className="badge">{challenge.difficulty}</span>
        <span className="badge badge--success">{challenge.max_points} pts</span>
        <span className={availability.className}>{availability.label}</span>
      </div>

      <p>{availability.detail}</p>

      <article className="card">
        <h3>Description</h3>
        <Markdown content={challenge.description} />
      </article>

      {challenge.setup_instructions && (
        <article className="card">
          <h3>Setup Instructions</h3>
          <Markdown content={challenge.setup_instructions} />
        </article>
      )}

      {challenge.resources && challenge.resources.length > 0 && (
        <article className="card">
          <h3>Resources</h3>
          <ul className="resource-list">
            {challenge.resources.map((r) => (
              <li key={r.url}>
                <a href={r.url} target="_blank" rel="noopener noreferrer">{r.label}</a>
              </li>
            ))}
          </ul>
        </article>
      )}

      <div className="actions">
        <Link to="/app/challenges" className="btn secondary">Back to challenges</Link>
        <Link to="/app/submit" className="btn primary">Submit solution</Link>
      </div>
    </>
  )
}
