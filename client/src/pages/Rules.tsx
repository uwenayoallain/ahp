import { useEffect } from 'react'
import { Markdown } from '../components/ui/Markdown'
import { EmptyState } from '../components/ui/EmptyState'
import { PageHeader } from '../components/ui/PageHeader'
import { useAppStore } from '../stores/app-store'

export function RulesPage() {
  const { data: rules, loading, error, fetchedAt } = useAppStore((s) => s.rules)
  const fetchRules = useAppStore((s) => s.fetchRules)

  useEffect(() => {
    void fetchRules()
  }, [fetchRules])

  if (loading && fetchedAt === 0) {
    return (
      <>
        <PageHeader title="Rules" subtitle="Participation guidelines, submission requirements, and fair play policy." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error && fetchedAt === 0) {
    return (
      <>
        <PageHeader title="Rules" subtitle="Participation guidelines, submission requirements, and fair play policy." />
        <p className="status-text status-text--error">{error}</p>
      </>
    )
  }

  return (
    <>
      <PageHeader
        title="Rules"
        subtitle="Participation guidelines, submission requirements, and fair play policy."
      />

      {rules.length === 0 ? (
        <EmptyState
          title="No rules published"
          message="The active hackathon does not have participant rules yet."
          detail="Admins can add fair play guidance, submission requirements, and delivery rules from the Hackathons area."
        />
      ) : (
        <section className="timeline">
          {rules.map((rule) => (
            <details className="card" key={rule.id} open>
              <summary>
                <strong>{rule.title}</strong>
              </summary>
              <Markdown content={rule.body} />
            </details>
          ))}
        </section>
      )}
    </>
  )
}
