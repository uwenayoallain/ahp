import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { adminNav, participantNav } from './nav'

function LinkRow({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/app'}
      className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
    >
      <span>{label}</span>
      <span aria-hidden="true">&rsaquo;</span>
    </NavLink>
  )
}

export function Sidebar() {
  const { userRole } = useAuth()

  return (
    <aside className="sidebar panel-surface">
      <div className="brand">
        <div className="brand-copy">
          <h1>Aegis</h1>
          <p>Hackathon Platform</p>
        </div>
      </div>

      <nav className="nav-links" aria-label="Main">
        {participantNav.map((item) => (
          <LinkRow key={item.to} to={item.to} label={item.label} />
        ))}
      </nav>

      {userRole === 'admin' && (
        <nav className="nav-links" aria-label="Admin">
          {adminNav.map((item) => (
            <LinkRow key={item.to} to={item.to} label={item.label} />
          ))}
        </nav>
      )}
    </aside>
  )
}
