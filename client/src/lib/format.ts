export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function statusLabel(status: string) {
  switch (status) {
    case 'submitted':
      return 'Submitted'
    case 'reviewed':
      return 'Reviewed'
    case 'accepted':
      return 'Accepted'
    case 'rejected':
      return 'Needs revision'
    default:
      return status.charAt(0).toUpperCase() + status.slice(1)
  }
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case 'accepted':
    case 'reviewed':
      return 'badge badge--success'
    case 'rejected':
      return 'badge badge--warning'
    default:
      return 'badge'
  }
}
