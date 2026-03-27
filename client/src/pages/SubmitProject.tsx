import type { FormEvent } from 'react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'
import { addSubmission } from '../lib/db'
import { formatDateTime, formatShortDate } from '../lib/format'
import { queueSubmissionSync, requestBackgroundSync } from '../lib/sync'

type ActiveHackathon = {
  id: number
  name: string
  description: string
  start_date: string
  end_date: string
}

type Challenge = {
  id: number
  day_number: number
  title: string
  slug: string
  difficulty: string
  summary: string
  max_points: number
  unlock_at: string
  submission_deadline_at: string | null
}

type MyTeam = {
  id: number
  name: string
}

type ChallengesResponse = { items: Challenge[] }
type TeamsResponse = { items: unknown[]; myTeam: MyTeam | null }
type CategoriesResponse = { items: string[] }

type FormState = {
  challengeId: string
  projectTitle: string
  category: string
  overview: string
  repoUrl: string
  demoUrl: string
  deliverables: string
  validationNotes: string
}

type ChallengeAvailability = {
  label: string
  className: string
  detail: string
  blocked: boolean
}

const fallbackCategories = [
  'Web Platform',
  'Developer Tools',
  'Data Systems',
  'Security',
  'Automation',
]

const initialState: FormState = {
  challengeId: '',
  projectTitle: '',
  category: '',
  overview: '',
  repoUrl: '',
  demoUrl: '',
  deliverables: '',
  validationNotes: '',
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `draft-${crypto.randomUUID()}`
  }

  return `draft-${new Date().getTime().toString(36)}`
}

function challengeAvailability(challenge: Challenge): ChallengeAvailability {
  const now = Date.now()
  const unlockAt = new Date(challenge.unlock_at).getTime()
  const deadlineAt = challenge.submission_deadline_at ? new Date(challenge.submission_deadline_at).getTime() : null

  if (Number.isFinite(unlockAt) && now < unlockAt) {
    return {
      label: 'Locked',
      className: 'badge badge--warning',
      detail: `Opens ${formatDateTime(challenge.unlock_at)}`,
      blocked: true,
    }
  }

  if (deadlineAt !== null && now > deadlineAt) {
    return {
      label: 'Late window',
      className: 'badge badge--neutral',
      detail: `Deadline passed ${formatDateTime(challenge.submission_deadline_at!)}`,
      blocked: false,
    }
  }

  return {
    label: 'Open',
    className: 'badge badge--success',
    detail: challenge.submission_deadline_at
      ? `Deadline ${formatDateTime(challenge.submission_deadline_at)}`
      : 'Open for submissions',
    blocked: false,
  }
}

function buildSubmissionDescription(state: FormState) {
  const parts = [
    `Overview\n${state.overview.trim()}`,
    `Repository\n${state.repoUrl.trim() || 'Not provided'}`,
    `Demo\n${state.demoUrl.trim() || 'Not provided'}`,
    `Deliverables\n${state.deliverables.trim()}`,
    `Validation Notes\n${state.validationNotes.trim() || 'Not provided'}`,
  ]

  return parts.join('\n\n')
}

function hasSubmissionMaterials(state: FormState) {
  return state.repoUrl.trim() !== '' || state.demoUrl.trim() !== ''
}

export function SubmitProjectPage() {
  const [step, setStep] = useState(1)
  const [state, setState] = useState<FormState>(initialState)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hackathon, setHackathon] = useState<ActiveHackathon | null>(null)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [myTeam, setMyTeam] = useState<MyTeam | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [hackathonData, challengeData, teamData, categoryData] = await Promise.all([
          apiRequest<ActiveHackathon | null>('/api/hackathons/active', { fallbackData: null }),
          apiRequest<ChallengesResponse>('/api/challenges', { fallbackData: { items: [] } }),
          apiRequest<TeamsResponse>('/api/teams', { fallbackData: { items: [], myTeam: null } }),
          apiRequest<CategoriesResponse>('/api/submissions/categories', { fallbackData: { items: [] } }),
        ])

        if (cancelled) {
          return
        }

        const nextCategories = categoryData.items.length > 0 ? categoryData.items : fallbackCategories
        const firstAvailableChallenge = challengeData.items.find((item) => challengeAvailability(item).blocked === false)

        setHackathon(hackathonData)
        setChallenges(challengeData.items)
        setMyTeam(teamData.myTeam)
        setCategories(nextCategories)
        setState((prev) => ({
          ...prev,
          category: prev.category || nextCategories[0] || '',
          challengeId: prev.challengeId || (firstAvailableChallenge ? String(firstAvailableChallenge.id) : ''),
        }))
      } catch (err) {
        if (!cancelled) {
          console.error('[SubmitProject] Failed to load form data', err)
          setLoadError(err instanceof Error ? err.message : 'Failed to load submission requirements')
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

  const selectedChallenge = challenges.find((challenge) => String(challenge.id) === state.challengeId) ?? null
  const selectedAvailability = selectedChallenge ? challengeAvailability(selectedChallenge) : null
  const availableChallenges = challenges.filter((challenge) => challengeAvailability(challenge).blocked === false)
  const descriptionPreview = buildSubmissionDescription(state)

  function canAdvance() {
    if (step === 1) {
      return state.challengeId !== '' && state.projectTitle.trim() !== '' && state.category.trim() !== ''
    }

    if (step === 2) {
      return state.overview.trim() !== '' && state.deliverables.trim() !== '' && hasSubmissionMaterials(state)
    }

    return true
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting || !selectedChallenge || selectedAvailability?.blocked) {
      return
    }

    setIsSubmitting(true)
    setLoadError('')
    setMessage('')

    try {
      const localId = createLocalId()
      const description = buildSubmissionDescription(state)
      const payload = {
        localId,
        teamName: myTeam?.name ?? '',
        members: '',
        projectTitle: state.projectTitle.trim(),
        description,
        category: state.category.trim(),
        updatedAt: new Date().toISOString(),
        version: 1,
        status: 'queued' as const,
      }

      await addSubmission(payload)
      await queueSubmissionSync(localId, {
        localId,
        challengeId: selectedChallenge.id,
        projectTitle: state.projectTitle.trim(),
        description,
        category: state.category.trim(),
        version: 1,
      })
      await requestBackgroundSync()

      setMessage('Submission received. Review status and scoring from My Submissions.')
      setState({
        ...initialState,
        category: categories[0] ?? '',
        challengeId: availableChallenges[0] ? String(availableChallenges[0].id) : '',
      })
      setStep(1)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader
          title="Submit"
          subtitle="Prepare the required materials, review the selected challenge, and queue a delivery."
        />
        <p className="status-text">Loading submission requirements...</p>
      </>
    )
  }

  if (loadError && hackathon === null && challenges.length === 0) {
    return (
      <>
        <PageHeader
          title="Submit"
          subtitle="Prepare the required materials, review the selected challenge, and queue a delivery."
        />
        <EmptyState
          title="Submission requirements unavailable"
          message={loadError}
          detail="Retry after the hackathon configuration and participant data are available."
        />
      </>
    )
  }

  if (!hackathon) {
    return (
      <>
        <PageHeader
          title="Submit"
          subtitle="Prepare the required materials, review the selected challenge, and queue a delivery."
        />
        <EmptyState
          title="No active hackathon"
          message="Submissions open only when an active hackathon is configured."
          detail="An admin needs to activate the current event before teams can submit challenge work."
        />
      </>
    )
  }

  if (!myTeam) {
    return (
      <>
        <PageHeader
          title="Submit"
          subtitle="Prepare the required materials, review the selected challenge, and queue a delivery."
        />
        <EmptyState
          title="Join a team first"
          message="Submissions are attached to your active hackathon team."
          detail="Create a team or request access before opening a challenge submission."
          action={(
            <Link className="btn secondary" to="/app/teams">
              Open Teams
            </Link>
          )}
        />
      </>
    )
  }

  if (challenges.length === 0) {
    return (
      <>
        <PageHeader
          title="Submit"
          subtitle="Prepare the required materials, review the selected challenge, and queue a delivery."
        />
        <EmptyState
          title="No challenges published"
          message="The active hackathon does not have any challenge briefs yet."
          detail="Once challenges are configured, this page will open the correct submission flow automatically."
        />
      </>
    )
  }

  if (availableChallenges.length === 0) {
    return (
      <>
        <PageHeader
          title="Submit"
          subtitle="Prepare the required materials, review the selected challenge, and queue a delivery."
        />
        <EmptyState
          title="No submission window is open yet"
          message="All configured challenges are still locked."
          detail="Wait for the next unlock time shown on the Challenges page, then return here to submit."
          action={(
            <Link className="btn secondary" to="/app/challenges">
              View Challenges
            </Link>
          )}
        />
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Submit"
        subtitle="Prepare the required materials, review the selected challenge, and queue a delivery."
      />

      <section className="panel-surface submit-shell">
        <div className="submit-shell-main">
          <div className="submit-shell-header">
            <div>
              <p className="badge badge--neutral">Step {step} of 3</p>
              <h3>Submit for {hackathon.name}</h3>
              <p className="status-text">
                Team {myTeam.name} · {formatShortDate(hackathon.start_date)} to {formatShortDate(hackathon.end_date)}
              </p>
            </div>
            {selectedChallenge && selectedAvailability && (
              <div className="submit-status-block">
                <span className={selectedAvailability.className}>{selectedAvailability.label}</span>
                <p>{selectedAvailability.detail}</p>
              </div>
            )}
          </div>

          {loadError && <p className="feedback feedback--error">{loadError}</p>}
          {message && <p className="feedback feedback--success">{message}</p>}

          <form className="submit-form" onSubmit={onSubmit}>
            {step === 1 && (
              <section className="submit-section">
                <div className="form-grid">
                  <label>
                    Challenge
                    <select
                      value={state.challengeId}
                      onChange={(event) => setState((prev) => ({ ...prev, challengeId: event.target.value }))}
                      required
                    >
                      <option value="">Select a challenge</option>
                      {challenges.map((challenge) => {
                        const availability = challengeAvailability(challenge)

                        return (
                          <option key={challenge.id} value={String(challenge.id)} disabled={availability.blocked}>
                            Day {challenge.day_number}: {challenge.title} · {availability.label}
                          </option>
                        )
                      })}
                    </select>
                  </label>

                  <label>
                    Project title
                    <input
                      value={state.projectTitle}
                      onChange={(event) => setState((prev) => ({ ...prev, projectTitle: event.target.value }))}
                      placeholder="Name the solution you are submitting"
                      required
                    />
                  </label>

                  <label>
                    Category
                    <select
                      value={state.category}
                      onChange={(event) => setState((prev) => ({ ...prev, category: event.target.value }))}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>
            )}

            {step === 2 && (
              <section className="submit-section">
                <div className="form-grid">
                  <label>
                    Overview
                    <textarea
                      value={state.overview}
                      onChange={(event) => setState((prev) => ({ ...prev, overview: event.target.value }))}
                      placeholder="What did your team build, what problem does it solve, and what approach did you take?"
                      required
                    />
                  </label>

                  <label>
                    Repository link
                    <input
                      value={state.repoUrl}
                      onChange={(event) => setState((prev) => ({ ...prev, repoUrl: event.target.value }))}
                      placeholder="https://github.com/your-team/project"
                    />
                  </label>

                  <label>
                    Demo or deployment link
                    <input
                      value={state.demoUrl}
                      onChange={(event) => setState((prev) => ({ ...prev, demoUrl: event.target.value }))}
                      placeholder="https://your-demo.example.com"
                    />
                  </label>

                  <label>
                    Delivered work
                    <textarea
                      value={state.deliverables}
                      onChange={(event) => setState((prev) => ({ ...prev, deliverables: event.target.value }))}
                      placeholder="List the main deliverables, features completed, or artifacts included in the submission."
                      required
                    />
                  </label>

                  <label>
                    Validation notes
                    <textarea
                      value={state.validationNotes}
                      onChange={(event) => setState((prev) => ({ ...prev, validationNotes: event.target.value }))}
                      placeholder="Optional: testing notes, benchmark results, known limitations, or handoff notes for reviewers."
                    />
                  </label>
                </div>
              </section>
            )}

            {step === 3 && selectedChallenge && selectedAvailability && (
              <section className="submit-section">
                <article className="card submit-review-card">
                  <div className="badge-row">
                    <span className="badge badge--neutral">Day {selectedChallenge.day_number}</span>
                    <span className={selectedAvailability.className}>{selectedAvailability.label}</span>
                    <span className="badge">{selectedChallenge.max_points} pts</span>
                  </div>
                  <h3>{selectedChallenge.title}</h3>
                  <p>{selectedChallenge.summary}</p>
                  <div className="stats-list">
                    <div className="stats-item">
                      <span>Project</span>
                      <strong>{state.projectTitle || '--'}</strong>
                    </div>
                    <div className="stats-item">
                      <span>Category</span>
                      <strong>{state.category || '--'}</strong>
                    </div>
                    <div className="stats-item">
                      <span>Team</span>
                      <strong>{myTeam.name}</strong>
                    </div>
                    <div className="stats-item">
                      <span>Submission window</span>
                      <strong>{selectedAvailability.detail}</strong>
                    </div>
                  </div>
                  <div className="code-block">{descriptionPreview}</div>
                </article>
              </section>
            )}

            <div className="actions">
              <button
                type="button"
                className="btn secondary"
                disabled={step === 1 || isSubmitting}
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  className="btn primary"
                  disabled={!canAdvance()}
                  onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  className="btn primary"
                  disabled={isSubmitting || selectedAvailability?.blocked === true}
                >
                  {isSubmitting ? 'Submitting...' : 'Queue Submission'}
                </button>
              )}
            </div>
          </form>
        </div>

        <aside className="submit-shell-side">
          <article className="card">
            <h3>What to submit</h3>
            <p>Every submission should clearly show the working outcome, where reviewers can inspect it, and what the team delivered for the selected challenge.</p>
            <ul className="resource-list">
              <li>A short overview of the solution and the approach taken</li>
              <li>A repository or demo link reviewers can open immediately</li>
              <li>A compact list of the deliverables included in this checkpoint</li>
              <li>Optional testing or benchmark notes if they help scoring</li>
            </ul>
          </article>

          {selectedChallenge ? (
            <article className="card">
              <div className="badge-row">
                <span className="badge badge--neutral">Day {selectedChallenge.day_number}</span>
                <span className="badge">{selectedChallenge.difficulty}</span>
              </div>
              <h3>{selectedChallenge.title}</h3>
              <p>{selectedChallenge.summary}</p>
              <p>{selectedAvailability?.detail}</p>
            </article>
          ) : (
            <EmptyState
              title="Select a challenge"
              message="Pick an available challenge to see the submission window and challenge context."
            />
          )}

          <article className="card">
            <h3>Before you queue it</h3>
            <ul className="resource-list">
              <li>Check that at least one reviewable link is reachable</li>
              <li>Match the delivery to the correct day and challenge</li>
              <li>Use validation notes for results, limits, or reviewer guidance</li>
              <li>Late-window submissions may still receive a penalty after the deadline</li>
            </ul>
          </article>
        </aside>
      </section>
    </>
  )
}
