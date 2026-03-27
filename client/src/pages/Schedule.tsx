import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'
import { formatDateTime } from '../lib/format'

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

type ScheduleEvent = {
  id: number
  day_number: number
  time: string
  title: string
  venue: string
}

type ChallengesResponse = { items: Challenge[] }
type ScheduleResponse = { items: ScheduleEvent[] }

function challengeState(challenge: Challenge) {
  const now = Date.now()
  const unlockAt = new Date(challenge.unlock_at).getTime()
  const deadlineAt = challenge.submission_deadline_at ? new Date(challenge.submission_deadline_at).getTime() : null

  if (Number.isFinite(unlockAt) && now < unlockAt) {
    return {
      label: 'Locked',
      className: 'badge badge--warning',
      detail: `Opens ${formatDateTime(challenge.unlock_at)}`,
    }
  }

  if (deadlineAt !== null && now > deadlineAt) {
    return {
      label: 'Late window',
      className: 'badge badge--neutral',
      detail: `Deadline passed ${formatDateTime(challenge.submission_deadline_at!)}`,
    }
  }

  return {
    label: 'Open',
    className: 'badge badge--success',
    detail: challenge.submission_deadline_at
      ? `Deadline ${formatDateTime(challenge.submission_deadline_at)}`
      : 'Open for submissions',
  }
}

export function SchedulePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [cData, sData] = await Promise.all([
          apiRequest<ChallengesResponse>('/api/challenges'),
          apiRequest<ScheduleResponse>('/api/schedule'),
        ])
        if (!cancelled) {
          setChallenges(cData.items)
          setEvents(sData.items)
          const availableDays = [...new Set([
            ...cData.items.map((challenge) => challenge.day_number),
            ...sData.items.map((event) => event.day_number),
          ])].sort((a, b) => a - b)
          setSelectedDay(availableDays[0] ?? null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load schedule')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  const days = [...new Set([
    ...challenges.map((challenge) => challenge.day_number),
    ...events.map((event) => event.day_number),
  ])].sort((a, b) => a - b)
  const dayEvents = events.filter((e) => e.day_number === selectedDay)
  const dayChallenge = challenges.find((c) => c.day_number === selectedDay)

  if (loading) {
    return (
      <>
        <PageHeader title="Challenges" subtitle="Daily challenge timeline, online sessions, and submission deadlines." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Challenges" subtitle="Daily challenge timeline, online sessions, and submission deadlines." />
        <p className="status-text status-text--error">{error}</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Challenges"
        subtitle="Daily challenge timeline, online sessions, and submission deadlines."
      />

      {days.length === 0 ? (
        <EmptyState
          title="No challenge days configured"
          message="The active hackathon does not have a published challenge calendar yet."
          detail="Once challenges and schedule slots are configured, this page will show the current day, availability windows, and online sessions."
        />
      ) : (
        <>
          <div className="actions">
            {days.map((day) => (
              <button
                key={day}
                className={`btn ${selectedDay === day ? 'primary' : 'secondary'}`}
                type="button"
                onClick={() => setSelectedDay(day)}
              >
                Day {day}
              </button>
            ))}
          </div>

          {dayChallenge ? (
            <Link to={`/app/challenges/${dayChallenge.slug}`} className="card">
              <div className="badge-row">
                <span className="badge">{dayChallenge.difficulty}</span>
                <span className="badge badge--success">{dayChallenge.max_points} pts</span>
                <span className={challengeState(dayChallenge).className}>{challengeState(dayChallenge).label}</span>
              </div>
              <h3>{dayChallenge.title}</h3>
              <p>{dayChallenge.summary}</p>
              <p>{challengeState(dayChallenge).detail}</p>
            </Link>
          ) : (
            <EmptyState
              title={`Day ${selectedDay} has no challenge brief`}
              message="This day is on the schedule, but a challenge has not been published yet."
            />
          )}

          {dayEvents.length > 0 ? (
            <section className="timeline">
              {dayEvents.map((slot) => (
                <article className="card timeline-item" key={slot.id}>
                  <p className="timeline-time">{slot.time}</p>
                  <div>
                    <h3>{slot.title}</h3>
                    {slot.venue && <p>Channel: {slot.venue}</p>}
                  </div>
                </article>
              ))}
            </section>
          ) : (
            <EmptyState
              title={`Day ${selectedDay} has no published sessions`}
              message="No online events or checkpoints have been added for this day yet."
            />
          )}
        </>
      )}
    </>
  )
}
