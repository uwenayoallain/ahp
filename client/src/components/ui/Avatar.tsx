type AvatarProps = {
  name: string | null
  src?: string | null
  size?: 'sm' | 'md' | 'lg'
}

function getInitials(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function hashColor(name: string | null): string {
  const colors = [
    '#2f5c49', '#5c4b8a', '#8a4b5c', '#4b6e8a',
    '#6e8a4b', '#8a6e4b', '#4b8a6e', '#5c2f49',
  ]
  if (!name) return colors[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  if (src) {
    return (
      <img
        className={`avatar avatar--${size}`}
        src={src}
        alt={name ?? 'User avatar'}
      />
    )
  }

  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ backgroundColor: hashColor(name) }}
      aria-label={name ?? 'User avatar'}
    >
      {getInitials(name)}
    </span>
  )
}
