import { apiRequest } from '../../lib/api'
import type { AdminSubmissionRecord, SubmissionStatus } from './submissionsData'

export type HackathonRecord = {
  id: number
  name: string
  slug: string
  description: string
  startDate: string
  endDate: string
  isActive: boolean
  teamSizeMin: number
  teamSizeMax: number
  latePolicy: 'reject' | 'accept_with_penalty'
  latePenaltyPercentPerHour: number
}

export type HackathonPayload = {
  name: string
  slug: string
  description: string
  startDate: string
  endDate: string
  teamSizeMin: number
  teamSizeMax: number
  latePolicy: 'reject' | 'accept_with_penalty'
  latePenaltyPercentPerHour: number
}

export type AdminChallengeRecord = {
  id: number
  dayNumber: number
  title: string
  slug: string
  difficulty: string
  summary: string
  description: string
  setupInstructions: string
  resources: string
  maxPoints: number
  unlockAt: string | null
  submissionDeadlineAt: string | null
}

export type AdminScheduleRecord = {
  id: number
  dayNumber: number
  time: string
  title: string
  venue: string
  sortOrder: number
}

export type AdminRuleRecord = {
  id: number
  title: string
  body: string
  sortOrder: number
}

export type AdminSkillModuleRecord = {
  id: string
  title: string
  description: string
  sortOrder: number
}

type AdminApiSubmissionRow = {
  id: number
  user_id: string
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
  id: string
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
  user_id: string
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
  userId: string
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

export async function fetchAdminHackathons() {
  const response = await apiRequest<{ items: HackathonRecord[] }>('/api/admin/hackathons')
  return response.items
}

export async function createAdminHackathon(payload: HackathonPayload) {
  return apiRequest<HackathonRecord>('/api/admin/hackathons', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateAdminHackathon(id: number, payload: Partial<HackathonPayload>) {
  return apiRequest<HackathonRecord>(`/api/admin/hackathons/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function activateAdminHackathon(id: number) {
  return apiRequest<{ status: string; id: number }>(`/api/admin/hackathons/${id}/activate`, {
    method: 'POST',
  })
}

export async function fetchAdminChallenges(hackathonId: number) {
  const response = await apiRequest<{ items: AdminChallengeRecord[] }>(`/api/admin/hackathons/${hackathonId}/challenges`)
  return response.items
}

export async function createAdminChallenge(hackathonId: number, payload: Omit<AdminChallengeRecord, 'id'>) {
  return apiRequest<AdminChallengeRecord>(`/api/admin/hackathons/${hackathonId}/challenges`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminChallenge(hackathonId: number, challengeId: number) {
  return apiRequest<{ status: string; id: number }>(`/api/admin/hackathons/${hackathonId}/challenges/${challengeId}`, {
    method: 'DELETE',
  })
}

export async function fetchAdminSchedule(hackathonId: number) {
  const response = await apiRequest<{ items: AdminScheduleRecord[] }>(`/api/admin/hackathons/${hackathonId}/schedule`)
  return response.items
}

export async function createAdminScheduleEvent(hackathonId: number, payload: Omit<AdminScheduleRecord, 'id'>) {
  return apiRequest<AdminScheduleRecord>(`/api/admin/hackathons/${hackathonId}/schedule`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminScheduleEvent(hackathonId: number, eventId: number) {
  return apiRequest<{ status: string; id: number }>(`/api/admin/hackathons/${hackathonId}/schedule/${eventId}`, {
    method: 'DELETE',
  })
}

export async function fetchAdminRules(hackathonId: number) {
  const response = await apiRequest<{ items: AdminRuleRecord[] }>(`/api/admin/hackathons/${hackathonId}/rules`)
  return response.items
}

export async function createAdminRule(hackathonId: number, payload: Omit<AdminRuleRecord, 'id'>) {
  return apiRequest<AdminRuleRecord>(`/api/admin/hackathons/${hackathonId}/rules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminRule(hackathonId: number, ruleId: number) {
  return apiRequest<{ status: string; id: number }>(`/api/admin/hackathons/${hackathonId}/rules/${ruleId}`, {
    method: 'DELETE',
  })
}

export async function fetchAdminSkillModules(hackathonId: number) {
  const response = await apiRequest<{ items: AdminSkillModuleRecord[] }>(`/api/admin/hackathons/${hackathonId}/skill-modules`)
  return response.items
}

export async function createAdminSkillModule(hackathonId: number, payload: AdminSkillModuleRecord) {
  return apiRequest<AdminSkillModuleRecord>(`/api/admin/hackathons/${hackathonId}/skill-modules`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deleteAdminSkillModule(hackathonId: number, moduleId: string) {
  return apiRequest<{ status: string; id: string }>(`/api/admin/hackathons/${hackathonId}/skill-modules/${moduleId}`, {
    method: 'DELETE',
  })
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
