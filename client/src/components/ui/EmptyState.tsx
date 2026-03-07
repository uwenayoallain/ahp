import type { ReactNode } from 'react'

type EmptyStateProps = {
  message: string
  action?: ReactNode
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <article className="card">
      <p>{message}</p>
      {action}
    </article>
  )
}
