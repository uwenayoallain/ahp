import { useEffect } from 'react'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useAppStore } from '../stores/app-store'

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
  const { data: modules, loading, error, fetchedAt } = useAppStore((s) => s.skillModules)
  const fetchSkillModules = useAppStore((s) => s.fetchSkillModules)

  useEffect(() => {
    void fetchSkillModules()
  }, [fetchSkillModules])

  if (loading && fetchedAt === 0) {
    return (
      <>
        <PageHeader title="Skill Tracks" subtitle="Optional prep modules to sharpen skills used in daily challenges." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error && fetchedAt === 0) {
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

      {modules.length === 0 ? (
        <EmptyState
          title="No skill tracks yet"
          message="The active hackathon has not published any preparation modules."
          detail="Once tracks are configured, this page will show readiness progress and completion status."
        />
      ) : (
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
      )}
    </>
  )
}
