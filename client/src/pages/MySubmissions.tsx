import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { formatShortDate, statusBadgeClass, statusLabel } from '../lib/format'
import { useAppStore } from '../stores/app-store'
import type { Submission } from '../stores/app-store'

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
  const { data: submissions, loading, error, fetchedAt } = useAppStore((s) => s.submissions)
  const fetchSubmissions = useAppStore((s) => s.fetchSubmissions)

  useEffect(() => {
    void fetchSubmissions()
  }, [fetchSubmissions])

  const isFirstLoad = loading && fetchedAt === 0

  return (
    <>
      <PageHeader
        title="My Submissions"
        subtitle="Your challenge solutions and their current status."
      />

      {isFirstLoad && <p className="status-text">Loading submissions...</p>}
      {error && fetchedAt === 0 && <p className="feedback feedback--error">{error}</p>}

      {!isFirstLoad && !error && submissions.length === 0 && (
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

      {submissions.length > 0 && (
        <DataTable
          columns={columns}
          data={submissions}
          keyExtractor={(sub) => sub.id}
        />
      )}
    </>
  )
}
