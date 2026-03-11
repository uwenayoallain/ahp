import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'
import { addSubmission } from '../lib/db'
import { queueSubmissionSync, requestBackgroundSync } from '../lib/sync'

type Challenge = {
  id: number
  day_number: number
  title: string
  slug: string
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
  description: string
  category: string
  mediaNotes: string
}

const initialState: FormState = {
  challengeId: '',
  projectTitle: '',
  description: '',
  category: '',
  mediaNotes: '',
}

function createLocalId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `draft-${crypto.randomUUID()}`
  }

  return `draft-${new Date().getTime().toString(36)}`
}

export function SubmitProjectPage() {
  const [step, setStep] = useState(1)
  const [state, setState] = useState<FormState>(initialState)
  const [message, setMessage] = useState('')
  const [loadError, setLoadError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [myTeam, setMyTeam] = useState<MyTeam | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [cData, tData, catData] = await Promise.all([
          apiRequest<ChallengesResponse>('/api/challenges'),
          apiRequest<TeamsResponse>('/api/teams'),
          apiRequest<CategoriesResponse>('/api/submissions/categories'),
        ])
        if (!cancelled) {
          setChallenges(cData.items)
          setMyTeam(tData.myTeam)
          setCategories(catData.items)
          if (catData.items.length > 0) {
            setState((prev) => prev.category === '' ? { ...prev, category: catData.items[0] } : prev)
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[SubmitProject] Failed to load form data', err)
          setLoadError('Could not load challenges and teams. You can still fill the form manually.')
        }
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  const selectedChallenge = challenges.find((c) => String(c.id) === state.challengeId)

  function canAdvance() {
    if (step === 1) return state.challengeId !== '' && state.projectTitle.trim() !== ''
    if (step === 2) return state.description.trim() !== ''
    return true
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (isSubmitting) return
    setIsSubmitting(true)

    try {
      const localId = createLocalId()
      const payload = {
        localId,
        teamName: myTeam?.name ?? '',
        members: '',
        projectTitle: state.projectTitle,
        description: state.description,
        category: state.category,
        updatedAt: new Date().toISOString(),
        version: 1,
        status: 'queued' as const,
      }

      await addSubmission(payload)
      await queueSubmissionSync(localId, {
        ...payload,
        teamId: myTeam?.id,
        challengeId: selectedChallenge?.id,
      })
      await requestBackgroundSync()

      setMessage('Submission received. You can track its status on the My Submissions page.')
      setState(initialState)
      setStep(1)
    } catch (err) {
      setMessage('')
      setLoadError(err instanceof Error ? err.message : 'Failed to submit')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Submit"
        subtitle="Complete all steps to submit your challenge solution."
      />

      <p className="badge">Step {step} of 3</p>

      {loadError && <p className="feedback feedback--error">{loadError}</p>}

      <form className="form-grid" onSubmit={onSubmit}>
        {step === 1 && (
          <>
            <label>
              Challenge
              <select
                value={state.challengeId}
                onChange={(event) => setState((prev) => ({ ...prev, challengeId: event.target.value }))}
                required
              >
                <option value="">Select a challenge</option>
                {challenges.map((c) => (
                  <option key={c.id} value={String(c.id)}>Day {c.day_number}: {c.title}</option>
                ))}
              </select>
            </label>
            {myTeam && (
              <p>Submitting as team: <strong>{myTeam.name}</strong></p>
            )}
            {!myTeam && (
              <p>No team assigned. Visit the Teams page to create or join one.</p>
            )}
            <label>
              Project title
              <input
                value={state.projectTitle}
                onChange={(event) => setState((prev) => ({ ...prev, projectTitle: event.target.value }))}
                required
              />
            </label>
            <label>
              Category
              <select
                value={state.category}
                onChange={(event) => setState((prev) => ({ ...prev, category: event.target.value }))}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
          </>
        )}

        {step === 2 && (
          <>
            <label>
              Solution description
              <textarea
                value={state.description}
                onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
                required
              />
            </label>
            <label>
              Supporting materials
              <textarea
                value={state.mediaNotes}
                onChange={(event) => setState((prev) => ({ ...prev, mediaNotes: event.target.value }))}
                placeholder="Links, benchmark results, or additional notes"
              />
            </label>
          </>
        )}

        {step === 3 && (
          <article className="card">
            <p className="badge">Review</p>
            <p>
              <strong>Challenge:</strong> {selectedChallenge ? `Day ${selectedChallenge.day_number}: ${selectedChallenge.title}` : '-'}
            </p>
            <p>
              <strong>Team:</strong> {myTeam?.name ?? 'Solo'}
            </p>
            <p>
              <strong>Project:</strong> {state.projectTitle || '-'}
            </p>
            <p>
              <strong>Category:</strong> {state.category}
            </p>
            <p>
              <strong>Description:</strong> {state.description || '-'}
            </p>
            <p>
              <strong>Materials:</strong> {state.mediaNotes || '-'}
            </p>
          </article>
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
            <button type="submit" className="btn primary" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          )}
        </div>
      </form>

      {message && <p className="feedback feedback--success">{message}</p>}
    </>
  )
}
