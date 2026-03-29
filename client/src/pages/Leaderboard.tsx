import { useEffect } from 'react'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useAppStore } from '../stores/app-store'
import type { LeaderboardEntry } from '../stores/app-store'

const columns = [
  {
    key: 'rank',
    header: '#',
    render: (_row: LeaderboardEntry, index: number) => index + 1,
  },
  {
    key: 'name',
    header: 'Team',
    render: (row: LeaderboardEntry) => <strong>{row.name}</strong>,
  },
  {
    key: 'members',
    header: 'Members',
    render: (row: LeaderboardEntry) => row.member_count,
  },
  {
    key: 'submissions',
    header: 'Submissions',
    render: (row: LeaderboardEntry) => row.submission_count,
  },
  {
    key: 'score',
    header: 'Score',
    render: (row: LeaderboardEntry) => <strong>{row.total_score}</strong>,
  },
]

export function LeaderboardPage() {
  const { data: teams, loading, error, fetchedAt } = useAppStore((s) => s.leaderboard)
  const fetchLeaderboard = useAppStore((s) => s.fetchLeaderboard)

  useEffect(() => {
    void fetchLeaderboard()
  }, [fetchLeaderboard])

  if (loading && fetchedAt === 0) {
    return (
      <>
        <PageHeader title="Leaderboard" subtitle="Team rankings by total score." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error && fetchedAt === 0) {
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
