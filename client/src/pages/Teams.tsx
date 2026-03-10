import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { DataTable } from '../components/ui/DataTable'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'

type TeamMember = {
  id: number
  name: string
  role: string
  joined_at: string
}

type MyTeam = {
  id: number
  name: string
  members: TeamMember[]
}

type TeamSummary = {
  id: number
  name: string
  created_by: number
  member_count: number
}

type TeamsResponse = {
  items: TeamSummary[]
  myTeam: MyTeam | null
}

type Feedback = {
  type: 'success' | 'error'
  text: string
}

export function TeamsPage() {
  const [teams, setTeams] = useState<TeamSummary[]>([])
  const [myTeam, setMyTeam] = useState<MyTeam | null>(null)
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [busy, setBusy] = useState(false)

  const loadTeams = useCallback(async () => {
    const data = await apiRequest<TeamsResponse>('/api/teams')
    setTeams(data.items)
    setMyTeam(data.myTeam)
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        await loadTeams()
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [loadTeams])

  function showFeedback(type: 'success' | 'error', text: string) {
    setFeedback({ type, text })
    if (type === 'success') {
      setTimeout(() => setFeedback(null), 3000)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setFeedback(null)
    setBusy(true)

    try {
      await apiRequest('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: newName }),
      })
      setNewName('')
      showFeedback('success', 'Team created successfully.')
      await loadTeams()
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setBusy(false)
    }
  }

  async function handleJoin(teamId: number) {
    setFeedback(null)
    setBusy(true)

    try {
      await apiRequest(`/api/teams/${teamId}/join`, { method: 'POST' })
      showFeedback('success', 'Joined team.')
      await loadTeams()
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to join team')
    } finally {
      setBusy(false)
    }
  }

  async function handleLeave(teamId: number) {
    setFeedback(null)
    setBusy(true)

    try {
      await apiRequest(`/api/teams/${teamId}/leave`, { method: 'POST' })
      setConfirmLeave(false)
      showFeedback('success', 'You left the team.')
      await loadTeams()
    } catch (err) {
      showFeedback('error', err instanceof Error ? err.message : 'Failed to leave team')
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title="Teams" subtitle="Create or join a team for the hackathon." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  const memberColumns = [
    {
      key: 'name',
      header: 'Member',
      render: (m: TeamMember) => m.name,
    },
    {
      key: 'role',
      header: 'Role',
      render: (m: TeamMember) => (
        <span className={`badge ${m.role === 'lead' ? 'badge--success' : 'badge--neutral'}`}>
          {m.role}
        </span>
      ),
    },
  ]

  const allTeamsColumns = [
    {
      key: 'name',
      header: 'Team',
      render: (t: TeamSummary) => <strong>{t.name}</strong>,
    },
    {
      key: 'members',
      header: 'Members',
      render: (t: TeamSummary) => t.member_count,
    },
    ...(!myTeam
      ? [
          {
            key: 'actions',
            header: '',
            render: (t: TeamSummary) => (
              <button
                className="btn secondary"
                type="button"
                disabled={busy}
                onClick={() => handleJoin(t.id)}
              >
                Join
              </button>
            ),
          },
        ]
      : []),
  ]

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle="Create or join a team for the hackathon."
      />

      {feedback && (
        <p className={`feedback feedback--${feedback.type}`}>{feedback.text}</p>
      )}

      {myTeam && (
        <article className="card">
          <h3>Your team: {myTeam.name}</h3>
          <DataTable
            columns={memberColumns}
            data={myTeam.members}
            keyExtractor={(m) => m.id}
          />
          <div className="actions">
            {confirmLeave ? (
              <>
                <span className="caption-text">
                  Leave this team?
                </span>
                <button
                  className="btn danger"
                  type="button"
                  disabled={busy}
                  onClick={() => handleLeave(myTeam.id)}
                >
                  Confirm
                </button>
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setConfirmLeave(false)}
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                className="btn danger"
                type="button"
                onClick={() => setConfirmLeave(true)}
              >
                Leave team
              </button>
            )}
          </div>
        </article>
      )}

      {!myTeam && (
        <article className="card">
          <h3>Create a team</h3>
          <form className="form-grid" onSubmit={handleCreate}>
            <label>
              Team name
              <input
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Circuit Breakers"
                required
                minLength={2}
                maxLength={50}
              />
            </label>
            <div className="actions">
              <button type="submit" className="btn primary" disabled={busy}>
                {busy ? 'Creating...' : 'Create team'}
              </button>
            </div>
          </form>
        </article>
      )}

      <article className="card">
        <h3>All teams</h3>
        {teams.length === 0 ? (
          <EmptyState message="No teams yet. Be the first to create one." />
        ) : (
          <DataTable
            columns={allTeamsColumns}
            data={teams}
            keyExtractor={(t) => t.id}
          />
        )}
      </article>
    </>
  )
}
