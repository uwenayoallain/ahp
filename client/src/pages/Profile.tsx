import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../hooks/useAuth'
import { apiRequest } from '../lib/api'
import { Avatar } from '../components/ui/Avatar'

type ProfileResponse = {
  userId: string
  displayName: string
  role: string
  avatarUrl: string
  bio: string
  email: string
}

export function ProfilePage() {
  const { userId, userName, userRole, userEmail, userAvatar, login } = useAuth()

  const [displayName, setDisplayName] = useState(userName ?? '')
  const [avatarUrl, setAvatarUrl] = useState(userAvatar ?? '')
  const [bio, setBio] = useState('')
  const [bioLoaded, setBioLoaded] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  if (!bioLoaded && userId) {
    void apiRequest<ProfileResponse>('/api/auth/me').then((data) => {
      setBio(data.bio)
      setBioLoaded(true)
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setIsSaving(true)
    setFeedback(null)

    try {
      await apiRequest('/api/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ displayName, bio, avatarUrl }),
      })
      await login()
      setFeedback({ type: 'success', message: 'Profile updated' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      setFeedback({ type: 'error', message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Profile</h1>
        <p className="page-subtitle">Manage your account settings and public profile</p>
      </div>

      <div className="profile-layout">
        <div className="profile-sidebar-card card">
          <div className="profile-avatar-section">
            <Avatar name={displayName || userName} src={avatarUrl || userAvatar} size="lg" />
            <h2>{displayName || userName || 'Anonymous'}</h2>
            <p className="caption-text">{userEmail}</p>
            <span className="badge">{userRole}</span>
          </div>
          <div className="profile-meta">
            <div className="profile-meta-row">
              <span>User ID</span>
              <code>{userId?.slice(0, 8)}...</code>
            </div>
          </div>
        </div>

        <form className="profile-form card" onSubmit={handleSubmit}>
          <h3>Edit profile</h3>

          <div className="form-grid">
            <label>
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                maxLength={100}
              />
            </label>

            <label>
              Avatar URL
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                maxLength={500}
              />
              <span className="caption-text">Paste a link to your profile picture</span>
            </label>

            <label>
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                maxLength={500}
                rows={4}
              />
              <span className="caption-text">{bio.length}/500</span>
            </label>

            <label>
              Email
              <input value={userEmail ?? ''} disabled />
              <span className="caption-text">Managed by your authentication provider</span>
            </label>
          </div>

          {feedback && (
            <p className={`feedback feedback--${feedback.type}`}>{feedback.message}</p>
          )}

          <div className="actions">
            <button type="submit" className="btn primary" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
