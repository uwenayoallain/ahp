import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { formatDateTime } from '../../lib/format'
import { fetchAdminSubmission, scoreSubmission } from './adminApi'
import type { AdminSubmissionDetail } from './adminApi'

export function AdminSubmissionDetailPage() {
  const { id } = useParams()
  const [record, setRecord] = useState<AdminSubmissionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [scoreInput, setScoreInput] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!id) return
      try {
        const detail = await fetchAdminSubmission(id)
        if (!cancelled) {
          setRecord(detail)
          if (detail.score !== null && detail.score !== undefined) {
            setScoreInput(String(detail.score))
          }
        }
      } catch {
        if (!cancelled) setRecord(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [id])

  async function handleScore(event: FormEvent) {
    event.preventDefault()
    if (!id) return

    const score = Number(scoreInput)
    if (Number.isNaN(score) || score < 0) return

    try {
      await scoreSubmission(id, score)
      setMessage('Score saved.')
      setRecord((prev) => prev ? { ...prev, score, status: 'Reviewed' } : prev)
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to score')
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Submission" subtitle="" />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (!record) {
    return (
      <section className="card">
        <p className="badge badge--warning">Not Found</p>
        <h3>Submission not found</h3>
        <p>The requested submission could not be located.</p>
        <Link className="btn secondary" to="/app/admin/submissions">
          Back to submissions
        </Link>
      </section>
    )
  }

  return (
    <>
      <PageHeader
        title={record.projectTitle}
        subtitle="Submission details, scoring, and review status."
        action={
          <div className="actions">
            <Link className="btn secondary" to="/app/admin/submissions">
              Back to submissions
            </Link>
          </div>
        }
      />

      <section className="detail-grid">
        <article className="card">
          <h3>{record.team || 'No team'}</h3>
          <p>Submitted by {record.userName}</p>
          <div className="detail-meta">
            <p>
              <strong>Challenge:</strong> {record.challengeTitle ? `Day ${record.dayNumber}: ${record.challengeTitle}` : '--'}
            </p>
            <p>
              <strong>Category:</strong> {record.category}
            </p>
            <p>
              <strong>Status:</strong> {record.status}
            </p>
            <p>
              <strong>Submitted:</strong> {formatDateTime(record.submittedAt)}
            </p>
            <p>
              <strong>Score:</strong> {record.score !== null ? record.score : 'Not scored'}
            </p>
          </div>
        </article>

        <article className="card">
          <h3>Score this submission</h3>
          <form className="form-grid" onSubmit={handleScore}>
            <label>
              Score (points)
              <input
                type="number"
                min="0"
                value={scoreInput}
                onChange={(event) => setScoreInput(event.target.value)}
                required
              />
            </label>
            <div className="actions">
              <button type="submit" className="btn primary">Save score</button>
            </div>
          </form>
          {message && <p className="status-text">{message}</p>}
        </article>
      </section>
    </>
  )
}
