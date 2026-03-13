import { useEffect, useState } from 'react'
import { PageHeader } from '../../components/ui/PageHeader'
import { fetchAdminUsers } from './adminApi'

type UserRow = {
  id: number
  name: string
  email: string
  role: string
  modules_started: number
  last_progress: string | null
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track" role="img" aria-label={`Progress ${value}%`}>
      <div className="progress-fill" style={{ width: `${value}%` }} />
    </div>
  )
}

export function AdminProgressPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [totalModules, setTotalModules] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await fetchAdminUsers()
        if (!cancelled) {
          setUsers(data.items.filter((u) => u.role !== 'admin'))
          setTotalModules(data.totalModules)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load progress')
        }
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
        <PageHeader title="Progress" subtitle="Completion and consistency trends across active participants." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Progress" subtitle="Completion and consistency trends across active participants." />
        <p className="status-text status-text--error">{error}</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Progress"
        subtitle="Completion and consistency trends across active participants."
      />

      <section className="timeline">
        {users.map((user) => {
          const modulePercent = totalModules > 0 ? Math.round((user.modules_started / totalModules) * 100) : 0

          return (
            <article className="card" key={user.id}>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <div className="progress-stack">
                <p>Skill modules started: {user.modules_started}/{totalModules} ({modulePercent}%)</p>
                <ProgressBar value={modulePercent} />
                {user.last_progress && (
                  <p>Last activity: {new Date(user.last_progress).toLocaleDateString()}</p>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </>
  )
}
