import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'
import { formatDateTime, statusBadgeClass, statusLabel } from '../lib/format'

type SubmissionDetail = {
  id: number
  project_title: string
  description: string
  team_name: string
  category: string
  status: string
  score: number | null
  challenge_title: string | null
  challenge_id: number | null
  day_number: number | null
  created_at: string
  updated_at: string
}

export function SubmissionDetailPage() {
  const { id } = useParams()
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<SubmissionDetail>(`/api/submissions/${id}`)
        if (!cancelled) {
          setSubmission(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load submission')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()
    return () => { cancelled = true }
  }, [id])

  if (loading) {
    return (
      <>
        <PageHeader title="Submission" subtitle="" />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error || !submission) {
    return (
      <>
        <PageHeader title="Submission" subtitle="" />
        <section className="card">
          <p>{error || 'Submission not found.'}</p>
          <Link className="btn secondary" to="/app/submissions">Back to submissions</Link>
        </section>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title={submission.project_title}
        subtitle={submission.challenge_title
          ? `Day ${submission.day_number}: ${submission.challenge_title}`
          : 'Challenge submission'}
        action={
          <Link className="btn secondary" to="/app/submissions">Back to submissions</Link>
        }
      />

      <section className="detail-grid">
        <article className="card">
          <h3>Description</h3>
          <p>{submission.description}</p>
        </article>

        <article className="card">
          <h3>Details</h3>
          <div className="detail-meta">
            <p>
              <strong>Team</strong>
              {submission.team_name || '--'}
            </p>
            <p>
              <strong>Category</strong>
              {submission.category}
            </p>
            <p>
              <strong>Status</strong>
              <span className={statusBadgeClass(submission.status)}>
                {statusLabel(submission.status)}
              </span>
            </p>
            <p>
              <strong>Score</strong>
              {submission.score !== null ? submission.score : 'Not scored'}
            </p>
            <p>
              <strong>Submitted</strong>
              {formatDateTime(submission.created_at)}
            </p>
            <p>
              <strong>Last updated</strong>
              {formatDateTime(submission.updated_at)}
            </p>
          </div>
        </article>
      </section>
    </>
  )
}
