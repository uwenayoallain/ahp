import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'

type SkillModule = {
  id: string
  title: string
  description: string
  sort_order: number
  progress_status: string | null
  completed_at: string | null
}

type ModulesResponse = { items: SkillModule[] }

function progressPercent(status: string | null) {
  if (status === 'completed') return 100
  if (status === 'in_progress') return 50
  return 0
}

function progressLabel(status: string | null) {
  if (status === 'completed') return 'Completed'
  if (status === 'in_progress') return 'In progress'
  return 'Not started'
}

export function SkillModulesPage() {
  const [modules, setModules] = useState<SkillModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<ModulesResponse>('/api/skill-modules')
        if (!cancelled) setModules(data.items)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load skill tracks')
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
        <PageHeader title="Skill Tracks" subtitle="Optional prep modules to sharpen skills used in daily challenges." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error) {
    return (
      <>
        <PageHeader title="Skill Tracks" subtitle="Optional prep modules to sharpen skills used in daily challenges." />
        <p className="status-text status-text--error">{error}</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Skill Tracks"
        subtitle="Optional prep modules to sharpen skills used in daily challenges."
      />

      <section className="grid-cards">
        {modules.map((mod) => (
          <article className="card" key={mod.id}>
            <span className="badge">{progressLabel(mod.progress_status)}</span>
            <h3>{mod.title}</h3>
            <p>{mod.description}</p>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuenow={progressPercent(mod.progress_status)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${mod.title}: ${progressLabel(mod.progress_status)}`}
            >
              <div className="progress-fill" style={{ width: `${progressPercent(mod.progress_status)}%` }} />
            </div>
          </article>
        ))}
      </section>
    </>
  )
}
