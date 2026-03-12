import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'

type Challenge = {
  id: number
  day_number: number
  title: string
  slug: string
  difficulty: string
  summary: string
  max_points: number
  unlock_at: string
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

export function SchedulePage() {
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [events, setEvents] = useState<ScheduleEvent[]>([])
  const [selectedDay, setSelectedDay] = useState(1)
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

  const days = [...new Set(events.map((e) => e.day_number))].sort()
  const dayEvents = events.filter((e) => e.day_number === selectedDay)
  const dayChallenge = challenges.find((c) => c.day_number === selectedDay)

  if (loading) {
    return (
      <>
        <PageHeader title="Challenges" subtitle="Daily challenge schedule, workshops, and submission deadlines." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Challenges" subtitle="Daily challenge schedule, workshops, and submission deadlines." />
        <p className="status-text status-text--error">{error}</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Challenges"
        subtitle="Daily challenge schedule, workshops, and submission deadlines."
      />

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

      {dayChallenge && (
        <Link to={`/app/challenges/${dayChallenge.slug}`} className="card">
          <div className="badge-row">
            <span className="badge">{dayChallenge.difficulty}</span>
            <span className="badge badge--success">{dayChallenge.max_points} pts</span>
          </div>
          <h3>{dayChallenge.title}</h3>
          <p>{dayChallenge.summary}</p>
        </Link>
      )}

      <section className="timeline">
        {dayEvents.map((slot) => (
          <article className="card timeline-item" key={slot.id}>
            <p className="timeline-time">{slot.time}</p>
            <div>
              <h3>{slot.title}</h3>
              <p>{slot.venue}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}
