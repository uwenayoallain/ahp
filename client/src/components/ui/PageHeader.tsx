import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  subtitle: string
  action?: ReactNode
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      {action ? (
        <div className="page-header-row">
          <h2 className="page-title">{title}</h2>
          {action}
        </div>
      ) : (
        <h2 className="page-title">{title}</h2>
      )}
      <p className="page-subtitle">{subtitle}</p>
    </header>
  )
}
