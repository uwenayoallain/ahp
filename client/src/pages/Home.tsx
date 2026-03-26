import { useEffect, useState } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { StatCard } from '../components/ui/StatCard'
import { apiRequest } from '../lib/api'
import { formatDateTime, formatShortDate } from '../lib/format'

type DashboardStats = {
  submissionCount: number
  totalScore: number
  rank: number | null
  teamName: string | null
  completedModules: number
  totalModules: number
}

type ActiveHackathon = {
  id: number
  name: string
  slug: string
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

type ScheduleEvent = {
  id: number
  day_number: number
  time: string
  title: string
  venue: string
  sort_order: number
}

type ChallengesResponse = {
  items: Challenge[]
}

type ScheduleResponse = {
  items: ScheduleEvent[]
}

type HomeData = {
  stats: DashboardStats
  hackathon: ActiveHackathon | null
  challenges: Challenge[]
  schedule: ScheduleEvent[]
}

type FocusItem = {
  title: string
  body: string
}

function defaultStats(): DashboardStats {
  return {
    submissionCount: 0,
    totalScore: 0,
    rank: null,
    teamName: null,
    completedModules: 0,
    totalModules: 0,
  }
}

function eventState(hackathon: ActiveHackathon) {
  const now = Date.now()
  const start = new Date(hackathon.start_date).getTime()
  const end = new Date(hackathon.end_date).getTime()

  if (now < start) {
    return {
      label: 'Upcoming',
      className: 'badge badge--neutral',
      detail: `Starts ${formatDateTime(hackathon.start_date)}`,
    }
  }

  if (now > end) {
    return {
      label: 'Completed',
      className: 'badge badge--warning',
      detail: `Ended ${formatDateTime(hackathon.end_date)}`,
    }
  }

  return {
    label: 'Live',
    className: 'badge badge--success',
    detail: `Ends ${formatDateTime(hackathon.end_date)}`,
  }
}

function challengeState(challenge: Challenge) {
  const now = Date.now()
  const unlockAt = new Date(challenge.unlock_at).getTime()
  const deadlineAt = challenge.submission_deadline_at ? new Date(challenge.submission_deadline_at).getTime() : null

  if (now < unlockAt) {
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
      detail: `Deadline ${formatDateTime(challenge.submission_deadline_at!)}`,
    }
  }

  return {
    label: 'Open',
    className: 'badge badge--success',
    detail: challenge.submission_deadline_at
      ? `Due ${formatDateTime(challenge.submission_deadline_at)}`
      : 'Submission window open',
  }
}

function toTimelineItems(hackathon: ActiveHackathon | null, schedule: ScheduleEvent[]) {
  if (!hackathon) {
    return schedule.map((item) => ({ ...item, startsAt: null }))
  }

  const startDate = new Date(hackathon.start_date)

  return schedule.map((item) => {
    const startsAt = new Date(startDate)
    startsAt.setUTCDate(startDate.getUTCDate() + item.day_number - 1)

    const [hours, minutes] = item.time.split(':').map((value) => Number(value))
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      startsAt.setUTCHours(hours, minutes, 0, 0)
      return { ...item, startsAt }
    }

    return { ...item, startsAt: null }
  })
}

function nextTimelineItems(hackathon: ActiveHackathon | null, schedule: ScheduleEvent[]) {
  const items = toTimelineItems(hackathon, schedule)
  const now = Date.now()

  if (hackathon) {
    const futureItems = items.filter((item) => item.startsAt !== null && item.startsAt.getTime() >= now)
    if (futureItems.length > 0) {
      return futureItems.slice(0, 4)
    }
  }

  return items.slice(0, 4)
}

function createFocusItems(stats: DashboardStats, hackathon: ActiveHackathon | null, challenges: Challenge[]): FocusItem[] {
  const items: FocusItem[] = []

  if (!hackathon) {
    items.push({
      title: 'Waiting for the next event',
      body: 'No active hackathon has been published yet. Check back once the next event window is announced.',
    })
    return items
  }

  if (!stats.teamName) {
    items.push({
      title: 'Join a team',
      body: 'Team access is request-based. Create your own team or request access to an open team before submissions begin.',
    })
  }

  if (stats.submissionCount === 0) {
    const firstOpenChallenge = challenges.find((challenge) => challengeState(challenge).label === 'Open')
    items.push({
      title: firstOpenChallenge ? `Start Day ${firstOpenChallenge.day_number}` : 'Prepare your first submission',
      body: firstOpenChallenge
        ? `${firstOpenChallenge.title} is open now. Review the brief and plan your first delivery window.`
        : 'Review the challenge lineup, rules, and deadlines so your first submission is ready when the event opens.',
    })
  }

  if (stats.completedModules < stats.totalModules) {
    items.push({
      title: 'Finish prep work',
      body: `You have completed ${stats.completedModules} of ${stats.totalModules} skill tracks. Use the remaining modules to close gaps before the next review window.`,
    })
  }

  if (items.length === 0) {
    items.push({
      title: 'Stay on pace',
      body: 'Keep your team aligned on the next challenge deadline, review the live schedule, and push reviewed submissions toward the leaderboard.',
    })
  }

  return items.slice(0, 3)
}

export function HomePage() {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [stats, hackathon, challenges, schedule] = await Promise.all([
          apiRequest<DashboardStats>('/api/me/stats'),
          apiRequest<ActiveHackathon | null>('/api/hackathons/active', { fallbackData: null }),
          apiRequest<ChallengesResponse>('/api/challenges', { fallbackData: { items: [] } }),
          apiRequest<ScheduleResponse>('/api/schedule', { fallbackData: { items: [] } }),
        ])

        if (!cancelled) {
          setData({
            stats,
            hackathon,
            challenges: challenges.items,
            schedule: schedule.items,
          })
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load dashboard')
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
        <PageHeader title="Dashboard" subtitle="Current event, upcoming sessions, and your working progress." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Dashboard" subtitle="Current event, upcoming sessions, and your working progress." />
        <p className="status-text status-text--error">{error}</p>
      </>
    )
  }

  const stats = data?.stats ?? defaultStats()
  const hackathon = data?.hackathon ?? null
  const challenges = data?.challenges ?? []
  const timeline = data?.schedule ?? []
  const overviewState = hackathon ? eventState(hackathon) : null
  const nextItems = nextTimelineItems(hackathon, timeline)
  const focusItems = createFocusItems(stats, hackathon, challenges)
  const latestChallenge = challenges[0]

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Current event, upcoming sessions, and your working progress."
      />

      <section className="home-summary panel-surface">
        <div className="home-summary-copy">
          <div className="badge-row">
            {overviewState ? (
              <span className={overviewState.className}>{overviewState.label}</span>
            ) : (
              <span className="badge badge--neutral">Planning</span>
            )}
            {stats.teamName ? <span className="badge">Team {stats.teamName}</span> : <span className="badge badge--neutral">No team yet</span>}
          </div>
          <div className="home-summary-text">
            <h3>{hackathon?.name ?? 'Next hackathon not published yet'}</h3>
            <p>
              {hackathon?.description ?? 'The dashboard will show the next published event here as soon as it is ready.'}
            </p>
          </div>
        </div>

        <div className="home-summary-facts">
          <div className="home-fact">
            <span>Event window</span>
            <strong>
              {hackathon ? `${formatShortDate(hackathon.start_date)} to ${formatShortDate(hackathon.end_date)}` : '--'}
            </strong>
          </div>
          <div className="home-fact">
            <span>Current phase</span>
            <strong>{overviewState?.detail ?? 'Waiting for the next active event'}</strong>
          </div>
          <div className="home-fact">
            <span>Challenge days</span>
            <strong>{challenges.length > 0 ? `${challenges.length} published` : 'No days published yet'}</strong>
          </div>
          <div className="home-fact">
            <span>Next milestone</span>
            <strong>
              {nextItems[0]
                ? `${nextItems[0].title} at ${nextItems[0].time}`
                : 'No scheduled sessions yet'}
            </strong>
          </div>
        </div>

        <div className="home-summary-media">
          <img
            src="/images/homepage-hero.png"
            alt="Online hackathon workspace showing code, challenge panels, and live collaboration surfaces"
            className="home-summary-image"
          />
        </div>
      </section>

      <section className="grid-cards">
        <StatCard
          label="Submissions"
          value={stats.submissionCount}
          description="Total challenge solutions submitted."
          badge={<span className="badge">Submissions</span>}
        />
        <StatCard
          label="Score"
          value={stats.totalScore}
          description="Points earned from reviewed submissions."
          badge={<span className="badge badge--success">Score</span>}
        />
        <StatCard
          label="Rank"
          value={stats.rank !== null ? `#${stats.rank}` : '--'}
          description={stats.teamName ? `Team: ${stats.teamName}` : 'Join a team to appear on the leaderboard.'}
          badge={<span className="badge">Rank</span>}
        />
        <StatCard
          label="Skill Tracks"
          value={`${stats.completedModules}/${stats.totalModules}`}
          description="Prep modules completed."
          badge={<span className="badge">Skill Tracks</span>}
        />
      </section>

      <section className="home-columns">
        <article className="panel-surface table-panel">
          <div className="home-section-head">
            <h3>What’s happening</h3>
            <p>Upcoming online sessions and deadlines from the active event timeline.</p>
          </div>

          {nextItems.length > 0 ? (
            <div className="home-event-list">
              {nextItems.map((item) => (
                <div className="home-event-row" key={item.id}>
                  <div className="home-event-time">
                    <strong>Day {item.day_number}</strong>
                    <span>{item.time}</span>
                  </div>
                  <div className="home-event-copy">
                    <h4>{item.title}</h4>
                    <p>{item.venue}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No sessions published"
              message="The active hackathon does not have any upcoming sessions or milestones yet."
            />
          )}
        </article>

        <article className="panel-surface table-panel">
          <div className="home-section-head">
            <h3>Focus next</h3>
            <p>Practical next moves based on your current team, submissions, and prep progress.</p>
          </div>

          <div className="home-focus-list">
            {focusItems.map((item) => (
              <div className="home-focus-item" key={item.title}>
                <h4>{item.title}</h4>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="home-columns">
        <article className="panel-surface table-panel">
          <div className="home-section-head">
            <h3>Challenge runway</h3>
            <p>Published challenge days, current availability, and submission windows.</p>
          </div>

          {challenges.length > 0 ? (
            <div className="home-challenge-list">
              {challenges.map((challenge) => {
                const state = challengeState(challenge)

                return (
                  <div className="home-challenge-row" key={challenge.id}>
                    <div className="home-challenge-day">
                      <span>Day {challenge.day_number}</span>
                      <strong>{challenge.max_points} pts</strong>
                    </div>
                    <div className="home-challenge-copy">
                      <div className="badge-row">
                        <span className="badge">{challenge.difficulty}</span>
                        <span className={state.className}>{state.label}</span>
                      </div>
                      <h4>{challenge.title}</h4>
                      <p>{challenge.summary}</p>
                      <p>{state.detail}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState
              title="No challenge days published"
              message="Challenge briefs will appear here once the active event is configured."
            />
          )}
        </article>

        <article className="panel-surface table-panel">
          <div className="home-section-head">
            <h3>Published now</h3>
            <p>A compact view of the current event posture and the first available challenge brief.</p>
          </div>

          {hackathon ? (
            <div className="home-focus-list">
              <div className="home-focus-item">
                <h4>Event status</h4>
                <p>{overviewState?.detail ?? 'No active event has been published.'}</p>
              </div>
              <div className="home-focus-item">
                <h4>Team standing</h4>
                <p>{stats.teamName ? `${stats.teamName}${stats.rank !== null ? ` is currently ranked #${stats.rank}.` : ' is not ranked yet.'}` : 'You are not attached to a team yet.'}</p>
              </div>
              <div className="home-focus-item">
                <h4>Latest brief</h4>
                <p>{latestChallenge ? `Day ${latestChallenge.day_number}: ${latestChallenge.title}` : 'No challenge brief is available yet.'}</p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="No active event"
              message="Publish and activate the current hackathon to populate this dashboard."
            />
          )}
        </article>
      </section>
    </>
  )
}
