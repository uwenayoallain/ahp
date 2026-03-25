import type { ReactNode } from 'react'

type EmptyStateProps = {
  title?: string
  message: string
  detail?: string
  action?: ReactNode
}

export function EmptyState({ title, message, detail, action }: EmptyStateProps) {
  return (
    <article className="card empty-state">
      {title && <h3>{title}</h3>}
      <p>{message}</p>
      {detail && <p className="empty-state-detail">{detail}</p>}
      {action && <div className="actions">{action}</div>}
    </article>
  )
}
