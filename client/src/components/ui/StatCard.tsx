import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: string | number
  description?: string
  badge?: ReactNode
}

export function StatCard({ label, value, description, badge }: StatCardProps) {
  return (
    <article className="card">
      {badge}
      <p className="metric">{value}</p>
      <h3>{label}</h3>
      {description && <p>{description}</p>}
    </article>
  )
}
