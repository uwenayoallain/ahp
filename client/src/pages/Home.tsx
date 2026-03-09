import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { apiRequest } from '../lib/api'

type DashboardStats = {
  submissionCount: number
  totalScore: number
  rank: number | null
  teamName: string | null
  completedModules: number
  totalModules: number
}

export function HomePage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<DashboardStats>('/api/me/stats')
        if (!cancelled) setStats(data)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your challenge progress, team, and score overview." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Your challenge progress, team, and score overview." />
        <p className="status-text status-text--error">{error}</p>
      </>
    )
  }

  const data = stats ?? {
    submissionCount: 0,
    totalScore: 0,
    rank: null,
    teamName: null,
    completedModules: 0,
    totalModules: 0,
  }

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your challenge progress, team, and score overview."
      />

      <section className="grid-cards">
        <StatCard
          label="Submissions"
          value={data.submissionCount}
          description="Total challenge solutions submitted."
          badge={<span className="badge">Submissions</span>}
        />
        <StatCard
          label="Score"
          value={data.totalScore}
          description="Points earned from reviewed submissions."
          badge={<span className="badge badge--success">Score</span>}
        />
        <StatCard
          label="Rank"
          value={data.rank !== null ? `#${data.rank}` : '--'}
          description={data.teamName ? `Team: ${data.teamName}` : 'Join a team to appear on the leaderboard.'}
          badge={<span className="badge">Rank</span>}
        />
        <StatCard
          label="Skill Tracks"
          value={`${data.completedModules}/${data.totalModules}`}
          description="Prep modules completed."
          badge={<span className="badge">Skill Tracks</span>}
        />
      </section>
    </>
  )
}
