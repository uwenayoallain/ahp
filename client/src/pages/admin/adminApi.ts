import { apiRequest } from '../../lib/api'
import type { AdminSubmissionRecord, SubmissionStatus } from './submissionsData'

type AdminApiSubmissionRow = {
  id: number
  user_id: number
  user_name: string
  team_name: string
  project_title: string
  challenge_title: string | null
  day_number: number | null
  category: string
  status: string
  score: number | null
  version: number
  updated_at: string
}

type AdminApiStats = {
  totalSubmissions: number
  totalUsers: number
  reviewRate: number
}

type AdminApiUserRow = {
  id: number
  name: string
  email: string
  role: string
  modules_started: number
  last_progress: string | null
}

function toUiStatus(status: string): SubmissionStatus {
  if (status === 'reviewed') return 'Reviewed'
  if (status === 'rejected') return 'Needs Fix'
  return 'Submitted'
}

function mapAdminSubmissionRows(rows: AdminApiSubmissionRow[]): AdminSubmissionRecord[] {
  return rows.map((row) => ({
    id: String(row.id),
    team: row.team_name ?? '',
    userName: row.user_name ?? '',
    projectTitle: row.project_title,
    challengeTitle: row.challenge_title,
    dayNumber: row.day_number,
    category: row.category,
    status: toUiStatus(row.status),
    submittedAt: row.updated_at,
    score: row.score,
  }))
}

type AdminApiSubmissionDetail = {
  id: number
  user_id: number
  user_name: string
  team_id: number | null
  team_name: string
  project_title: string
  description: string
  challenge_id: number | null
  challenge_title: string | null
  day_number: number | null
  category: string
  status: string
  score: number | null
  version: number
  created_at: string
  updated_at: string
}

export type AdminSubmissionDetail = {
  id: string
  userId: number
  userName: string
  team: string
  projectTitle: string
  description: string
  challengeTitle: string | null
  dayNumber: number | null
  category: string
  status: SubmissionStatus
  score: number | null
  submittedAt: string
}

function mapAdminSubmissionDetail(row: AdminApiSubmissionDetail): AdminSubmissionDetail {
  return {
    id: String(row.id),
    userId: row.user_id,
    userName: row.user_name ?? '',
    team: row.team_name ?? '',
    projectTitle: row.project_title,
    description: row.description,
    challengeTitle: row.challenge_title,
    dayNumber: row.day_number,
    category: row.category,
    status: toUiStatus(row.status),
    score: row.score,
    submittedAt: row.updated_at,
  }
}

export async function fetchAdminSubmissions() {
  const response = await apiRequest<{ items: AdminApiSubmissionRow[] }>('/api/admin/submissions')
  return mapAdminSubmissionRows(response.items)
}

export async function fetchAdminSubmission(id: string) {
  const row = await apiRequest<AdminApiSubmissionDetail>(`/api/admin/submissions/${id}`)
  return mapAdminSubmissionDetail(row)
}

export async function fetchAdminStats() {
  return apiRequest<AdminApiStats>('/api/admin/stats')
}

export async function fetchAdminUsers() {
  const response = await apiRequest<{ items: AdminApiUserRow[]; totalModules: number }>('/api/admin/users')
  return { items: response.items, totalModules: response.totalModules }
}

export async function scoreSubmission(id: string, score: number) {
  return apiRequest<{ status: string }>(`/api/admin/submissions/${id}/score`, {
    method: 'PATCH',
    body: JSON.stringify({ score }),
  })
}
