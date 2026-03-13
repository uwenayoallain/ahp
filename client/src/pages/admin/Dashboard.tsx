import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { fetchAdminStats, fetchAdminSubmissions } from './adminApi'

type DashboardStats = {
  totalSubmissions: number
  totalUsers: number
  reviewRate: number
}

const initialStats: DashboardStats = {
  totalSubmissions: 0,
  totalUsers: 0,
  reviewRate: 0,
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState(initialStats)
  const [activityRows, setActivityRows] = useState<string[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [statsPayload, submissions] = await Promise.all([
          fetchAdminStats(),
          fetchAdminSubmissions(),
        ])

        if (cancelled === false) {
          setStats(statsPayload)
          setActivityRows(
            submissions.slice(0, 5).map((row) => `${row.team} submitted ${row.projectTitle}`),
          )
        }
      } catch (err) {
        if (cancelled === false) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Submission volume, active participants, and review progress."
      />

      {error && <p className="status-text status-text--error">{error}</p>}

      <section className="panel-surface table-panel">
        <h3>Current Metrics</h3>
        <div className="stats-list">
          <div className="stats-item">
            <span>Total submissions</span>
            <strong className="metric">{stats.totalSubmissions}</strong>
          </div>
          <div className="stats-item">
            <span>Total participants</span>
            <strong className="metric">{stats.totalUsers}</strong>
          </div>
          <div className="stats-item">
            <span>Review rate</span>
            <strong className="metric">{Math.round(stats.reviewRate * 100)}%</strong>
          </div>
        </div>
      </section>

      {activityRows.length > 0 && (
        <section className="panel-surface table-panel">
          <h3>Recent Activity</h3>
          <div className="timeline">
            {activityRows.map((item, index) => (
              <div className="timeline-item" key={`${item}-${index}`}>
                <p className="timeline-time">-{index + 1}m</p>
                <p>{item}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}
