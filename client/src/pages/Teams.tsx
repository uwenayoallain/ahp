import { useEffect, useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../lib/api'
import { formatDateTime } from '../lib/format'

type TeamRecord = {
  id: number
  name: string
  created_by: string
  member_count: number
  capacity: number
  is_locked: boolean
}

type TeamMember = {
  id: string
  name: string
  role: string
  joined_at: string
}

type TeamRequest = {
  id: number
  team_id: number
  team_name?: string
  requester_user_id?: string
  requester_name?: string
  status: string
  message?: string
  created_at: string
}

type MyTeam = {
  id: number
  name: string
  members: TeamMember[]
}

type TeamsResponse = {
  items: TeamRecord[]
  myTeam: MyTeam | null
  incomingRequests: TeamRequest[]
  myRequests: TeamRequest[]
}

function myLeadStatus(myTeam: MyTeam | null, userId: string | null) {
  if (!myTeam || !userId) {
    return false
  }

  return myTeam.members.some((member) => member.id === userId && member.role === 'lead')
}

export function TeamsPage() {
  const { userId } = useAuth()
  const [teams, setTeams] = useState<TeamRecord[]>([])
  const [myTeam, setMyTeam] = useState<MyTeam | null>(null)
  const [incomingRequests, setIncomingRequests] = useState<TeamRequest[]>([])
  const [myRequests, setMyRequests] = useState<TeamRequest[]>([])
  const [teamName, setTeamName] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<TeamsResponse>('/api/teams')
        if (cancelled) {
          return
        }

        setTeams(data.items)
        setMyTeam(data.myTeam)
        setIncomingRequests(data.incomingRequests)
        setMyRequests(data.myRequests)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load teams')
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

  async function refreshTeams() {
    const data = await apiRequest<TeamsResponse>('/api/teams')
    setTeams(data.items)
    setMyTeam(data.myTeam)
    setIncomingRequests(data.incomingRequests)
    setMyRequests(data.myRequests)
  }

  async function handleCreateTeam() {
    setWorking(true)
    setError('')
    setMessage('')

    try {
      const created = await apiRequest<{ id: number; name: string }>('/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: teamName }),
      })
      setTeamName('')
      await refreshTeams()
      setMessage(`Team ${created.name} created.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setWorking(false)
    }
  }

  async function handleRequestAccess(teamId: number) {
    setWorking(true)
    setError('')
    setMessage('')

    try {
      await apiRequest(`/api/teams/${teamId}/requests`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      await refreshTeams()
      setMessage('Access request sent.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to request team access')
    } finally {
      setWorking(false)
    }
  }

  async function handleCancelRequest(requestId: number) {
    setWorking(true)
    setError('')
    setMessage('')

    try {
      await apiRequest(`/api/teams/requests/${requestId}/cancel`, {
        method: 'POST',
      })
      await refreshTeams()
      setMessage('Request cancelled.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel request')
    } finally {
      setWorking(false)
    }
  }

  async function handleApproveRequest(requestId: number) {
    setWorking(true)
    setError('')
    setMessage('')

    try {
      await apiRequest(`/api/teams/requests/${requestId}/approve`, {
        method: 'POST',
      })
      await refreshTeams()
      setMessage('Request approved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve request')
    } finally {
      setWorking(false)
    }
  }

  async function handleRejectRequest(requestId: number) {
    setWorking(true)
    setError('')
    setMessage('')

    try {
      await apiRequest(`/api/teams/requests/${requestId}/reject`, {
        method: 'POST',
      })
      await refreshTeams()
      setMessage('Request rejected.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject request')
    } finally {
      setWorking(false)
    }
  }

  async function handleLeaveTeam() {
    if (!myTeam) {
      return
    }

    setWorking(true)
    setError('')
    setMessage('')

    try {
      await apiRequest(`/api/teams/${myTeam.id}/leave`, {
        method: 'POST',
      })
      await refreshTeams()
      setMessage('You left the team.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to leave team')
    } finally {
      setWorking(false)
    }
  }

  const isLead = myLeadStatus(myTeam, userId)
  const pendingRequestTeamIds = new Set(
    myRequests.filter((request) => request.status === 'pending').map((request) => request.team_id),
  )

  if (loading) {
    return (
      <>
        <PageHeader title="Teams" subtitle="Create a team or request access to an existing one." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Teams"
        subtitle="Create a team or request access to an existing one."
      />

      {error && <p className="status-text status-text--error">{error}</p>}
      {message && <p className="status-text">{message}</p>}

      {myTeam ? (
        <section className="panel-surface table-panel">
          <h3>My Team</h3>
          <div className="actions">
            <span className="badge">{myTeam.name}</span>
            {teams.find((item) => item.id === myTeam.id)?.is_locked ? (
              <span className="badge badge--warning">Locked after first submission</span>
            ) : (
              <button
                type="button"
                className="btn secondary"
                disabled={working}
                onClick={() => void handleLeaveTeam()}
              >
                Leave team
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {myTeam.members.map((member) => (
                  <tr key={member.id}>
                    <td>{member.name || member.id}</td>
                    <td>{member.role}</td>
                    <td>{formatDateTime(member.joined_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="panel-surface table-panel">
          <h3>Create Team</h3>
          <div className="form-grid">
            <label>
              Team name
              <input
                value={teamName}
                placeholder="Enter a team name"
                onChange={(event) => setTeamName(event.target.value)}
              />
            </label>
          </div>
          <div className="actions">
            <button
              type="button"
              className="btn primary"
              disabled={working || teamName.trim().length < 2 || pendingRequestTeamIds.size > 0}
              onClick={() => void handleCreateTeam()}
            >
              Create team
            </button>
            {pendingRequestTeamIds.size > 0 && (
              <span className="badge badge--warning">Cancel pending requests before creating a new team.</span>
            )}
          </div>
        </section>
      )}

      {myRequests.length > 0 && (
        <section className="panel-surface table-panel">
          <h3>My Requests</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Status</th>
                  <th>Requested</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {myRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.team_name ?? teams.find((team) => team.id === request.team_id)?.name ?? `Team ${request.team_id}`}</td>
                    <td>
                      <span className={request.status === 'pending' ? 'badge' : 'badge badge--neutral'}>
                        {request.status}
                      </span>
                    </td>
                    <td>{formatDateTime(request.created_at)}</td>
                    <td>
                      {request.status === 'pending' && (
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={working}
                          onClick={() => void handleCancelRequest(request.id)}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {isLead && incomingRequests.length > 0 && (
        <section className="panel-surface table-panel">
          <h3>Incoming Requests</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Requester</th>
                  <th>Message</th>
                  <th>Requested</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {incomingRequests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.requester_name ?? request.requester_user_id}</td>
                    <td>{request.message || '--'}</td>
                    <td>{formatDateTime(request.created_at)}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn primary"
                          disabled={working}
                          onClick={() => void handleApproveRequest(request.id)}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn secondary"
                          disabled={working}
                          onClick={() => void handleRejectRequest(request.id)}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="panel-surface table-panel">
        <h3>All Teams</h3>
        {teams.length === 0 ? (
          <EmptyState
            title="No teams yet"
            message="No participant teams have been created for the active hackathon."
            detail="Create the first team to start inviting members and preparing submissions."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Members</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => {
                  const isFull = team.member_count >= team.capacity
                  const isMyTeam = myTeam?.id === team.id
                  const hasPendingRequest = pendingRequestTeamIds.has(team.id)
                  const disabled = working || isMyTeam || myTeam !== null || hasPendingRequest || isFull || team.is_locked

                  return (
                    <tr key={team.id}>
                      <td>{team.name}</td>
                      <td>{team.member_count}/{team.capacity}</td>
                      <td>
                        {team.is_locked ? (
                          <span className="badge badge--warning">Locked</span>
                        ) : isFull ? (
                          <span className="badge badge--neutral">Full</span>
                        ) : (
                          <span className="badge badge--success">Open</span>
                        )}
                      </td>
                      <td>
                        {isMyTeam ? (
                          <span className="badge">Current team</span>
                        ) : hasPendingRequest ? (
                          <span className="badge">Request pending</span>
                        ) : (
                          <button
                            type="button"
                            className="btn secondary"
                            disabled={disabled}
                            onClick={() => void handleRequestAccess(team.id)}
                          >
                            Request access
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
