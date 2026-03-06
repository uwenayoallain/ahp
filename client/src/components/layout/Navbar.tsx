import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useNetwork } from '../../hooks/useNetwork'

export function Navbar() {
  const { isOnline } = useNetwork()
  const { logout } = useAuth()

  return (
    <header className="topbar panel-surface">
      <p className="topbar-title">Aegis Hackathon</p>
      <div className="actions">
        <div className={`net-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </div>
        <Link className="btn secondary" to="/" onClick={logout}>
          Log out
        </Link>
      </div>
    </header>
  )
}
