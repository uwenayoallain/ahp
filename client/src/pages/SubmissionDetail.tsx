import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Markdown } from '../components/ui/Markdown'
import { PageHeader } from '../components/ui/PageHeader'
import { formatDateTime, statusBadgeClass, statusLabel } from '../lib/format'
import { useAppStore } from '../stores/app-store'

export function SubmissionDetailPage() {
  const { id } = useParams()
  const fetchSubmissionDetail = useAppStore((s) => s.fetchSubmissionDetail)
  const entry = useAppStore((s) => s.submissionDetails[id ?? ''])
  const submission = entry?.data ?? null
  const loading = entry?.loading ?? true
  const error = entry?.error ?? ''
  const fetchedAt = entry?.fetchedAt ?? 0

  useEffect(() => {
    if (id) void fetchSubmissionDetail(id)
  }, [id, fetchSubmissionDetail])

  if (loading && fetchedAt === 0) {
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
          <Markdown content={submission.description} />
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
