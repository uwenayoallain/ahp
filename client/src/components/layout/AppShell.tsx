import { NavLink, Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { participantNav } from './nav'

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-panel">
        <Navbar />
        <main className="page">
          <Outlet />
        </main>
      </div>

      <nav className="bottom-nav" aria-label="Mobile">
        {participantNav.slice(0, 4).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <span>{item.short}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
