import { useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { apiRequest } from '../lib/api'

type Rule = {
  id: number
  title: string
  body: string
  sort_order: number
}

type RulesResponse = { items: Rule[] }

export function RulesPage() {
  const [rules, setRules] = useState<Rule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const data = await apiRequest<RulesResponse>('/api/rules')
        if (!cancelled) setRules(data.items)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load rules')
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
        <PageHeader title="Rules" subtitle="Participation guidelines, submission requirements, and fair play policy." />
        <p className="status-text">Loading...</p>
      </>
    )
  }

  if (error) {
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

      <section className="timeline">
        {rules.map((rule) => (
          <details className="card" key={rule.id} open>
            <summary>
              <strong>{rule.title}</strong>
            </summary>
            <p>{rule.body}</p>
          </details>
        ))}
      </section>
    </>
  )
}
