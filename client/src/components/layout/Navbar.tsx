import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useNetwork } from '../../hooks/useNetwork'
import { Avatar } from '../ui/Avatar'

export function Navbar() {
  const { isOnline } = useNetwork()
  const { userName, userAvatar, logout } = useAuth()

  return (
    <header className="topbar panel-surface">
      <p className="topbar-title">Aegis Hackathon</p>
      <div className="actions">
        <div className={`net-status ${isOnline ? 'online' : 'offline'}`}>
          {isOnline ? 'Online' : 'Offline'}
        </div>
        <Link className="topbar-user" to="/app/profile">
          <Avatar name={userName} src={userAvatar} size="sm" />
          <span className="topbar-user-name">{userName || 'Account'}</span>
        </Link>
        <Link className="btn secondary" to="/" onClick={() => void logout()}>
          Log out
        </Link>
      </div>
    </header>
  )
}
