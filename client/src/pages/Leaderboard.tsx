import { useEffect, useState } from 'react'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'

type TeamScore = {
  id: number
  name: string
  member_count: number
  total_score: number
  submission_count: number
}

type LeaderboardResponse = { items: TeamScore[] }

const columns = [
  {
    key: 'rank',
    header: '#',
    render: (_row: TeamScore, index: number) => index + 1,
  },
  {
    key: 'name',
    header: 'Team',
    render: (row: TeamScore) => <strong>{row.name}</strong>,
  },
  {
    key: 'members',
    header: 'Members',
    render: (row: TeamScore) => row.member_count,
  },
  {
    key: 'submissions',
    header: 'Submissions',
    render: (row: TeamScore) => row.submission_count,
  },
  {
    key: 'score',
    header: 'Score',
    render: (row: TeamScore) => <strong>{row.total_score}</strong>,
  },
]

export function LeaderboardPage() {
  const [teams, setTeams] = useState<TeamScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<LeaderboardResponse>('/api/leaderboard')
        if (!cancelled) setTeams(data.items)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load leaderboard')
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
        <PageHeader title="Leaderboard" subtitle="Team rankings by total score." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Leaderboard" subtitle="Team rankings by total score." />
        <p className="status-text status-text--error">{error}</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Leaderboard"
        subtitle="Team rankings by total score."
      />

      {teams.length === 0 && (
        <EmptyState message="No teams have scored yet." />
      )}

      {teams.length > 0 && (
        <DataTable
          columns={columns}
          data={teams}
          keyExtractor={(team) => team.id}
        />
      )}
    </>
  )
}
