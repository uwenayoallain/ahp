import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'
import { formatShortDate, statusBadgeClass, statusLabel } from '../lib/format'

type Submission = {
  id: number
  team_name: string
  project_title: string
  category: string
  status: string
  score: number | null
  challenge_title: string | null
  day_number: number | null
  created_at: string
  updated_at: string
}

type SubmissionsResponse = {
  items: Submission[]
}

const columns = [
  {
    key: 'challenge',
    header: 'Challenge',
    render: (sub: Submission) => sub.challenge_title ? `Day ${sub.day_number}` : '--',
  },
  {
    key: 'project',
    header: 'Project',
    render: (sub: Submission) => (
      <Link className="link-strong" to={`/app/submissions/${sub.id}`}>
        {sub.project_title}
      </Link>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (sub: Submission) => (
      <span className={statusBadgeClass(sub.status)}>
        {statusLabel(sub.status)}
      </span>
    ),
  },
  {
    key: 'score',
    header: 'Score',
    render: (sub: Submission) => sub.score !== null ? sub.score : '--',
  },
  {
    key: 'submitted',
    header: 'Submitted',
    render: (sub: Submission) => formatShortDate(sub.created_at),
  },
]

export function MySubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<SubmissionsResponse>('/api/submissions')
        if (!cancelled) {
          setSubmissions(data.items)
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : 'Failed to load submissions'
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  return (
    <>
      <PageHeader
        title="My Submissions"
        subtitle="Your challenge solutions and their current status."
      />

      {loading && <p className="status-text">Loading submissions...</p>}
      {error && <p className="feedback feedback--error">{error}</p>}

      {!loading && !error && submissions.length === 0 && (
        <EmptyState
          title="No submissions yet"
          message="You have not submitted a challenge solution yet."
          detail="Use the Submit page once your team has an open challenge and the required delivery links are ready."
          action={(
            <Link className="btn secondary" to="/app/submit">
              Open Submit
            </Link>
          )}
        />
      )}

      {!loading && submissions.length > 0 && (
        <DataTable
          columns={columns}
          data={submissions}
          keyExtractor={(sub) => sub.id}
        />
      )}
    </>
  )
}
