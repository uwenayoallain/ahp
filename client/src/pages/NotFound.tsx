import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="public-shell">
      <div className="error-boundary-content">
        <h1>Page not found</h1>
        <p>The page you requested does not exist.</p>
        <Link to="/" className="btn primary">Go home</Link>
      </div>
    </div>
  )
}
