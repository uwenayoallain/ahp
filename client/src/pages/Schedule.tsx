import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { formatDateTime } from '../lib/format'
import { useAppStore } from '../stores/app-store'
import type { Challenge } from '../stores/app-store'

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
  const challengesState = useAppStore((s) => s.challenges)
  const eventsState = useAppStore((s) => s.schedule)
  const fetchChallenges = useAppStore((s) => s.fetchChallenges)
  const fetchSchedule = useAppStore((s) => s.fetchSchedule)
  const [selectedDay, setSelectedDay] = useState<number | null>(null)

  useEffect(() => {
    void fetchChallenges()
    void fetchSchedule()
  }, [fetchChallenges, fetchSchedule])

  const challenges = challengesState.data
  const events = eventsState.data

  const loading = (challengesState.loading || eventsState.loading) && challengesState.fetchedAt === 0
  const error = challengesState.error || eventsState.error

  const days = [...new Set([
    ...challenges.map((challenge) => challenge.day_number),
    ...events.map((event) => event.day_number),
  ])].sort((a, b) => a - b)

  const effectiveDay = selectedDay !== null && days.includes(selectedDay)
    ? selectedDay
    : days[0] ?? null
  const dayEvents = events.filter((e) => e.day_number === effectiveDay)
  const dayChallenge = challenges.find((c) => c.day_number === effectiveDay)

  if (loading) {
    return (
      <>
        <PageHeader title="Challenges" subtitle="Daily challenge timeline, online sessions, and submission deadlines." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error && challengesState.fetchedAt === 0) {
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
                className={`btn ${effectiveDay === day ? 'primary' : 'secondary'}`}
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
              title={`Day ${effectiveDay} has no challenge brief`}
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
              title={`Day ${effectiveDay} has no published sessions`}
              message="No online events or checkpoints have been added for this day yet."
            />
          )}
        </>
      )}
    </>
  )
}
