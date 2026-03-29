import { useEffect, useState } from 'react'
import { EmptyState } from '../../components/ui/EmptyState'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  activateAdminHackathon,
  createAdminChallenge,
  createAdminHackathon,
  createAdminRule,
  createAdminScheduleEvent,
  createAdminSkillModule,
  deleteAdminChallenge,
  deleteAdminRule,
  deleteAdminScheduleEvent,
  deleteAdminSkillModule,
  fetchAdminChallenges,
  fetchAdminHackathons,
  fetchAdminRules,
  fetchAdminSchedule,
  fetchAdminSkillModules,
  updateAdminHackathon,
  type AdminChallengeRecord,
  type AdminRuleRecord,
  type AdminScheduleRecord,
  type AdminSkillModuleRecord,
  type HackathonPayload,
  type HackathonRecord,
} from './adminApi'

type HackathonFormState = HackathonPayload

type ChallengeFormState = {
  dayNumber: string
  title: string
  slug: string
  difficulty: string
  summary: string
  description: string
  setupInstructions: string
  resources: string
  maxPoints: string
  unlockAt: string
  submissionDeadlineAt: string
}

type ScheduleFormState = {
  dayNumber: string
  time: string
  title: string
  venue: string
  sortOrder: string
}

type RuleFormState = {
  title: string
  body: string
  sortOrder: string
}

type SkillModuleFormState = {
  id: string
  title: string
  description: string
  sortOrder: string
}

function emptyHackathonForm(): HackathonFormState {
  return {
    name: '',
    slug: '',
    description: '',
    startDate: '',
    endDate: '',
    teamSizeMin: 1,
    teamSizeMax: 4,
    latePolicy: 'accept_with_penalty',
    latePenaltyPercentPerHour: 20,
  }
}

function emptyChallengeForm(): ChallengeFormState {
  return {
    dayNumber: '',
    title: '',
    slug: '',
    difficulty: 'medium',
    summary: '',
    description: '',
    setupInstructions: '',
    resources: '[]',
    maxPoints: '100',
    unlockAt: '',
    submissionDeadlineAt: '',
  }
}

function emptyScheduleForm(): ScheduleFormState {
  return {
    dayNumber: '',
    time: '',
    title: '',
    venue: '',
    sortOrder: '0',
  }
}

function emptyRuleForm(): RuleFormState {
  return {
    title: '',
    body: '',
    sortOrder: '0',
  }
}

function emptySkillModuleForm(): SkillModuleFormState {
  return {
    id: '',
    title: '',
    description: '',
    sortOrder: '0',
  }
}

function toDateTimeInput(value: string) {
  return value ? new Date(value).toISOString().slice(0, 16) : ''
}

function toHackathonForm(record: HackathonRecord): HackathonFormState {
  return {
    name: record.name,
    slug: record.slug,
    description: record.description,
    startDate: toDateTimeInput(record.startDate),
    endDate: toDateTimeInput(record.endDate),
    teamSizeMin: record.teamSizeMin,
    teamSizeMax: record.teamSizeMax,
    latePolicy: record.latePolicy,
    latePenaltyPercentPerHour: record.latePenaltyPercentPerHour,
  }
}

function toModuleId(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatDateValue(value: string | null) {
  return value ? new Date(value).toLocaleString() : '--'
}

function selectedHackathonRecord(items: HackathonRecord[], selectedId: number | null) {
  return items.find((item) => item.id === selectedId) ?? null
}

export function AdminHackathonsPage() {
  const [hackathons, setHackathons] = useState<HackathonRecord[]>([])
  const [selectedHackathonId, setSelectedHackathonId] = useState<number | null>(null)
  const [hackathonForm, setHackathonForm] = useState<HackathonFormState>(emptyHackathonForm)
  const [challengeForm, setChallengeForm] = useState<ChallengeFormState>(emptyChallengeForm)
  const [scheduleForm, setScheduleForm] = useState<ScheduleFormState>(emptyScheduleForm)
  const [ruleForm, setRuleForm] = useState<RuleFormState>(emptyRuleForm)
  const [skillModuleForm, setSkillModuleForm] = useState<SkillModuleFormState>(emptySkillModuleForm)
  const [challenges, setChallenges] = useState<AdminChallengeRecord[]>([])
  const [schedule, setSchedule] = useState<AdminScheduleRecord[]>([])
  const [rules, setRules] = useState<AdminRuleRecord[]>([])
  const [skillModules, setSkillModules] = useState<AdminSkillModuleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const items = await fetchAdminHackathons()
        if (cancelled) {
          return
        }

        setHackathons(items)
        const nextSelected = items.find((item) => item.isActive)?.id ?? items[0]?.id ?? null
        setSelectedHackathonId(nextSelected)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load hackathons')
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

  useEffect(() => {
    const current = selectedHackathonRecord(hackathons, selectedHackathonId)
    if (current) {
      setHackathonForm(toHackathonForm(current))
    } else {
      setHackathonForm(emptyHackathonForm())
    }
  }, [hackathons, selectedHackathonId])

  useEffect(() => {
    let cancelled = false

    async function loadDetails() {
      if (selectedHackathonId === null) {
        setChallenges([])
        setSchedule([])
        setRules([])
        setSkillModules([])
        return
      }

      setDetailsLoading(true)

      try {
        const [challengeItems, scheduleItems, ruleItems, moduleItems] = await Promise.all([
          fetchAdminChallenges(selectedHackathonId),
          fetchAdminSchedule(selectedHackathonId),
          fetchAdminRules(selectedHackathonId),
          fetchAdminSkillModules(selectedHackathonId),
        ])

        if (!cancelled) {
          setChallenges(challengeItems)
          setSchedule(scheduleItems)
          setRules(ruleItems)
          setSkillModules(moduleItems)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load hackathon details')
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false)
        }
      }
    }

    void loadDetails()
    return () => { cancelled = true }
  }, [selectedHackathonId])

  async function refreshHackathons(nextSelectedId?: number | null) {
    const items = await fetchAdminHackathons()
    setHackathons(items)

    const fallbackSelected = items.find((item) => item.isActive)?.id ?? items[0]?.id ?? null
    setSelectedHackathonId(nextSelectedId ?? fallbackSelected)
  }

  async function handleCreateHackathon() {
    setError('')
    setMessage('')

    try {
      const created = await createAdminHackathon(hackathonForm)
      await refreshHackathons(created.id)
      setMessage(`Hackathon ${created.name} created.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hackathon')
    }
  }

  async function handleSaveHackathon() {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      const updated = await updateAdminHackathon(selectedHackathonId, hackathonForm)
      await refreshHackathons(updated.id)
      setMessage(`Hackathon ${updated.name} updated.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update hackathon')
    }
  }

  async function handleActivateHackathon(id: number) {
    setError('')
    setMessage('')

    try {
      await activateAdminHackathon(id)
      await refreshHackathons(id)
      setMessage('Active hackathon updated.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to activate hackathon')
    }
  }

  async function handleCreateChallenge() {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      const created = await createAdminChallenge(selectedHackathonId, {
        dayNumber: Number(challengeForm.dayNumber),
        title: challengeForm.title,
        slug: challengeForm.slug,
        difficulty: challengeForm.difficulty,
        summary: challengeForm.summary,
        description: challengeForm.description,
        setupInstructions: challengeForm.setupInstructions,
        resources: challengeForm.resources,
        maxPoints: Number(challengeForm.maxPoints),
        unlockAt: challengeForm.unlockAt || null,
        submissionDeadlineAt: challengeForm.submissionDeadlineAt || null,
      })
      setChallenges((prev) => [...prev, created].sort((a, b) => a.dayNumber - b.dayNumber))
      setChallengeForm(emptyChallengeForm())
      setMessage(`Challenge ${created.title} added.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge')
    }
  }

  async function handleDeleteChallenge(id: number) {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      await deleteAdminChallenge(selectedHackathonId, id)
      setChallenges((prev) => prev.filter((item) => item.id !== id))
      setMessage('Challenge removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete challenge')
    }
  }

  async function handleCreateScheduleEvent() {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      const created = await createAdminScheduleEvent(selectedHackathonId, {
        dayNumber: Number(scheduleForm.dayNumber),
        time: scheduleForm.time,
        title: scheduleForm.title,
        venue: scheduleForm.venue,
        sortOrder: Number(scheduleForm.sortOrder),
      })
      setSchedule((prev) => [...prev, created].sort((a, b) => a.dayNumber - b.dayNumber || a.sortOrder - b.sortOrder))
      setScheduleForm(emptyScheduleForm())
      setMessage('Schedule event added.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create schedule event')
    }
  }

  async function handleDeleteScheduleEvent(id: number) {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      await deleteAdminScheduleEvent(selectedHackathonId, id)
      setSchedule((prev) => prev.filter((item) => item.id !== id))
      setMessage('Schedule event removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete schedule event')
    }
  }

  async function handleCreateRule() {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      const created = await createAdminRule(selectedHackathonId, {
        title: ruleForm.title,
        body: ruleForm.body,
        sortOrder: Number(ruleForm.sortOrder),
      })
      setRules((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder))
      setRuleForm(emptyRuleForm())
      setMessage('Rule added.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create rule')
    }
  }

  async function handleDeleteRule(id: number) {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      await deleteAdminRule(selectedHackathonId, id)
      setRules((prev) => prev.filter((item) => item.id !== id))
      setMessage('Rule removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete rule')
    }
  }

  async function handleCreateSkillModule() {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    const moduleId = skillModuleForm.id || toModuleId(skillModuleForm.title)

    try {
      const created = await createAdminSkillModule(selectedHackathonId, {
        id: moduleId,
        title: skillModuleForm.title,
        description: skillModuleForm.description,
        sortOrder: Number(skillModuleForm.sortOrder),
      })
      setSkillModules((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id)))
      setSkillModuleForm(emptySkillModuleForm())
      setMessage('Skill module added.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create skill module')
    }
  }

  async function handleDeleteSkillModule(id: string) {
    if (selectedHackathonId === null) {
      return
    }

    setError('')
    setMessage('')

    try {
      await deleteAdminSkillModule(selectedHackathonId, id)
      setSkillModules((prev) => prev.filter((item) => item.id !== id))
      setMessage('Skill module removed.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete skill module')
    }
  }

  const selectedHackathon = selectedHackathonRecord(hackathons, selectedHackathonId)

  if (loading) {
    return (
      <>
        <PageHeader title="Hackathons" subtitle="Manage event configuration, content, and activation state." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Hackathons"
        subtitle="Manage event configuration, content, and activation state."
      />

      {error && <p className="status-text status-text--error">{error}</p>}
      {message && <p className="status-text">{message}</p>}

      <section className="panel-surface table-panel">
        <h3>Hackathon Catalog</h3>
        {hackathons.length === 0 ? (
          <EmptyState
            title="No hackathons yet"
            message="Create the first hackathon to publish schedules, challenges, rules, and skill tracks."
          />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Dates</th>
                  <th>Teams</th>
                  <th>Late policy</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {hackathons.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => setSelectedHackathonId(item.id)}
                      >
                        {item.name}
                      </button>
                    </td>
                    <td>{new Date(item.startDate).toLocaleDateString()} to {new Date(item.endDate).toLocaleDateString()}</td>
                    <td>{item.teamSizeMin} - {item.teamSizeMax}</td>
                    <td>{item.latePolicy === 'reject' ? 'Reject' : `${item.latePenaltyPercentPerHour}% / hr`}</td>
                    <td>
                      <span className={item.isActive ? 'badge badge--success' : 'badge badge--neutral'}>
                        {item.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      {!item.isActive && (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => void handleActivateHackathon(item.id)}
                        >
                          Activate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel-surface table-panel">
        <h3>{selectedHackathon ? `Edit ${selectedHackathon.name}` : 'Create Hackathon'}</h3>
        <p className="status-text">
          Set the active hackathon dates so the participant app shows the event as upcoming, live, or completed. To keep the platform on day 1, make the active hackathon start today.
        </p>
        <div className="form-grid">
          <label>
            Name
            <input
              value={hackathonForm.name}
              onChange={(event) => setHackathonForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </label>
          <label>
            Slug
            <input
              value={hackathonForm.slug}
              onChange={(event) => setHackathonForm((prev) => ({ ...prev, slug: event.target.value }))}
            />
          </label>
          <label>
            Start
            <input
              type="datetime-local"
              value={hackathonForm.startDate}
              onChange={(event) => setHackathonForm((prev) => ({ ...prev, startDate: event.target.value }))}
            />
          </label>
          <label>
            End
            <input
              type="datetime-local"
              value={hackathonForm.endDate}
              onChange={(event) => setHackathonForm((prev) => ({ ...prev, endDate: event.target.value }))}
            />
          </label>
          <label>
            Team minimum
            <input
              type="number"
              min="1"
              value={hackathonForm.teamSizeMin}
              onChange={(event) => setHackathonForm((prev) => ({ ...prev, teamSizeMin: Number(event.target.value) }))}
            />
          </label>
          <label>
            Team maximum
            <input
              type="number"
              min="1"
              value={hackathonForm.teamSizeMax}
              onChange={(event) => setHackathonForm((prev) => ({ ...prev, teamSizeMax: Number(event.target.value) }))}
            />
          </label>
          <label>
            Late policy
            <select
              value={hackathonForm.latePolicy}
              onChange={(event) => setHackathonForm((prev) => ({
                ...prev,
                latePolicy: event.target.value as HackathonPayload['latePolicy'],
              }))}
            >
              <option value="accept_with_penalty">Accept with penalty</option>
              <option value="reject">Reject</option>
            </select>
          </label>
          <label>
            Late penalty % per hour
            <input
              type="number"
              min="0"
              value={hackathonForm.latePenaltyPercentPerHour}
              onChange={(event) => setHackathonForm((prev) => ({
                ...prev,
                latePenaltyPercentPerHour: Number(event.target.value),
              }))}
            />
          </label>
          <label>
            Description
            <textarea
              value={hackathonForm.description}
              onChange={(event) => setHackathonForm((prev) => ({ ...prev, description: event.target.value }))}
            />
          </label>
        </div>

        <div className="actions">
          <button type="button" className="btn primary" onClick={() => void handleCreateHackathon()}>
            Create
          </button>
          <button
            type="button"
            className="btn secondary"
            disabled={selectedHackathonId === null}
            onClick={() => void handleSaveHackathon()}
          >
            Save selected
          </button>
        </div>
      </section>

      {selectedHackathon && (
        <>
          <section className="panel-surface table-panel">
            <h3>Challenges</h3>
            {detailsLoading && <p className="status-text">Loading hackathon details...</p>}
            <div className="form-grid">
              <label>
                Day number
                <input
                  type="number"
                  min="1"
                  value={challengeForm.dayNumber}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, dayNumber: event.target.value }))}
                />
              </label>
              <label>
                Title
                <input
                  value={challengeForm.title}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label>
                Slug
                <input
                  value={challengeForm.slug}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, slug: event.target.value }))}
                />
              </label>
              <label>
                Difficulty
                <input
                  value={challengeForm.difficulty}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, difficulty: event.target.value }))}
                />
              </label>
              <label>
                Max points
                <input
                  type="number"
                  min="0"
                  value={challengeForm.maxPoints}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, maxPoints: event.target.value }))}
                />
              </label>
              <label>
                Unlock at
                <input
                  type="datetime-local"
                  value={challengeForm.unlockAt}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, unlockAt: event.target.value }))}
                />
              </label>
              <label>
                Deadline
                <input
                  type="datetime-local"
                  value={challengeForm.submissionDeadlineAt}
                  onChange={(event) => setChallengeForm((prev) => ({
                    ...prev,
                    submissionDeadlineAt: event.target.value,
                  }))}
                />
              </label>
              <label>
                Summary
                <textarea
                  value={challengeForm.summary}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, summary: event.target.value }))}
                />
              </label>
              <label>
                Description
                <textarea
                  value={challengeForm.description}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
              <label>
                Setup instructions
                <textarea
                  value={challengeForm.setupInstructions}
                  onChange={(event) => setChallengeForm((prev) => ({
                    ...prev,
                    setupInstructions: event.target.value,
                  }))}
                />
              </label>
              <label>
                Resources JSON
                <textarea
                  value={challengeForm.resources}
                  onChange={(event) => setChallengeForm((prev) => ({ ...prev, resources: event.target.value }))}
                />
              </label>
            </div>
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => void handleCreateChallenge()}>
                Add challenge
              </button>
            </div>
            <div className="table-wrap">
              {challenges.length === 0 ? (
                <EmptyState
                  title="No challenges yet"
                  message="Add the day briefs and submission windows for this hackathon."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Title</th>
                      <th>Availability</th>
                      <th>Points</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {challenges.map((item) => (
                      <tr key={item.id}>
                        <td>{item.dayNumber}</td>
                        <td>{item.title}</td>
                        <td>{formatDateValue(item.unlockAt)} / {formatDateValue(item.submissionDeadlineAt)}</td>
                        <td>{item.maxPoints}</td>
                        <td>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => void handleDeleteChallenge(item.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="panel-surface table-panel">
            <h3>Schedule</h3>
            <div className="form-grid">
              <label>
                Day number
                <input
                  type="number"
                  min="1"
                  value={scheduleForm.dayNumber}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, dayNumber: event.target.value }))}
                />
              </label>
              <label>
                Time
                <input
                  value={scheduleForm.time}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, time: event.target.value }))}
                />
              </label>
              <label>
                Title
                <input
                  value={scheduleForm.title}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label>
                Channel
                <input
                  value={scheduleForm.venue}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, venue: event.target.value }))}
                />
              </label>
              <label>
                Sort order
                <input
                  type="number"
                  value={scheduleForm.sortOrder}
                  onChange={(event) => setScheduleForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                />
              </label>
            </div>
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => void handleCreateScheduleEvent()}>
                Add schedule event
              </button>
            </div>
            <div className="table-wrap">
              {schedule.length === 0 ? (
                <EmptyState
                  title="No schedule items yet"
                  message="Add online sessions, unlock checkpoints, and review windows for this hackathon."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Day</th>
                      <th>Time</th>
                      <th>Title</th>
                      <th>Channel</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((item) => (
                      <tr key={item.id}>
                        <td>{item.dayNumber}</td>
                        <td>{item.time}</td>
                        <td>{item.title}</td>
                        <td>{item.venue || '--'}</td>
                        <td>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => void handleDeleteScheduleEvent(item.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="panel-surface table-panel">
            <h3>Rules</h3>
            <div className="form-grid">
              <label>
                Title
                <input
                  value={ruleForm.title}
                  onChange={(event) => setRuleForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label>
                Sort order
                <input
                  type="number"
                  value={ruleForm.sortOrder}
                  onChange={(event) => setRuleForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                />
              </label>
              <label>
                Body
                <textarea
                  value={ruleForm.body}
                  onChange={(event) => setRuleForm((prev) => ({ ...prev, body: event.target.value }))}
                />
              </label>
            </div>
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => void handleCreateRule()}>
                Add rule
              </button>
            </div>
            <div className="table-wrap">
              {rules.length === 0 ? (
                <EmptyState
                  title="No rules yet"
                  message="Add participation guidance and submission requirements for this hackathon."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Title</th>
                      <th>Body</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map((item) => (
                      <tr key={item.id}>
                        <td>{item.sortOrder}</td>
                        <td>{item.title}</td>
                        <td>{item.body}</td>
                        <td>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => void handleDeleteRule(item.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section className="panel-surface table-panel">
            <h3>Skill Modules</h3>
            <div className="form-grid">
              <label>
                Module id
                <input
                  value={skillModuleForm.id}
                  placeholder="auto-generated from title if blank"
                  onChange={(event) => setSkillModuleForm((prev) => ({ ...prev, id: event.target.value }))}
                />
              </label>
              <label>
                Title
                <input
                  value={skillModuleForm.title}
                  onChange={(event) => setSkillModuleForm((prev) => ({ ...prev, title: event.target.value }))}
                />
              </label>
              <label>
                Sort order
                <input
                  type="number"
                  value={skillModuleForm.sortOrder}
                  onChange={(event) => setSkillModuleForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
                />
              </label>
              <label>
                Description
                <textarea
                  value={skillModuleForm.description}
                  onChange={(event) => setSkillModuleForm((prev) => ({ ...prev, description: event.target.value }))}
                />
              </label>
            </div>
            <div className="actions">
              <button type="button" className="btn primary" onClick={() => void handleCreateSkillModule()}>
                Add module
              </button>
            </div>
            <div className="table-wrap">
              {skillModules.length === 0 ? (
                <EmptyState
                  title="No skill modules yet"
                  message="Add any preparation tracks or learning modules that should appear for participants."
                />
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Id</th>
                      <th>Title</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {skillModules.map((item) => (
                      <tr key={item.id}>
                        <td>{item.sortOrder}</td>
                        <td>{item.id}</td>
                        <td>{item.title}</td>
                        <td>
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => void handleDeleteSkillModule(item.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </>
      )}
    </>
  )
}
