import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'

type Resource = {
  label: string
  url: string
}

type Challenge = {
  id: number
  hackathon_id: number
  day_number: number
  title: string
  slug: string
  difficulty: string
  summary: string
  description: string
  setup_instructions: string
  resources: Resource[]
  max_points: number
  unlock_at: string
}

export function ChallengeDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<Challenge>(`/api/challenges/${slug}`)
        if (!cancelled) setChallenge(data)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load challenge')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [slug])

  if (loading) {
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

  return (
    <>
      <PageHeader
        title={`Day ${challenge.day_number}: ${challenge.title}`}
        subtitle={challenge.summary}
      />

      <div className="badge-row">
        <span className="badge">{challenge.difficulty}</span>
        <span className="badge badge--success">{challenge.max_points} pts</span>
      </div>

      <article className="card">
        <h3>Description</h3>
        <p className="text-prewrap">{challenge.description}</p>
      </article>

      {challenge.setup_instructions && (
        <article className="card">
          <h3>Setup Instructions</h3>
          <pre className="code-block">
            {challenge.setup_instructions}
          </pre>
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
