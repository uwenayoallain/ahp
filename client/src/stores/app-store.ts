import { create } from 'zustand'
import { apiRequest } from '../lib/api'

const STALE_TIME = 60_000

type ActiveHackathon = {
  id: number
  name: string
  slug: string
  description: string
  start_date: string
  end_date: string
}

type Challenge = {
  id: number
  day_number: number
  title: string
  slug: string
  difficulty: string
  summary: string
  max_points: number
  unlock_at: string
  submission_deadline_at: string | null
}

type ChallengeDetail = {
  id: number
  hackathon_id: number
  day_number: number
  title: string
  slug: string
  difficulty: string
  summary: string
  description: string
  setup_instructions: string
  resources: { label: string, url: string }[]
  max_points: number
  unlock_at: string
  submission_deadline_at: string | null
}

type ScheduleEvent = {
  id: number
  day_number: number
  time: string
  title: string
  venue: string
  sort_order: number
}

type Rule = {
  id: number
  title: string
  body: string
  sort_order: number
}

type LeaderboardEntry = {
  id: number
  name: string
  member_count: number
  submission_count: number
  total_score: number
}

type DashboardStats = {
  submissionCount: number
  totalScore: number
  rank: number | null
  teamName: string | null
  completedModules: number
  totalModules: number
}

type SkillModule = {
  id: string
  title: string
  description: string
  sort_order: number
  progress_status: string | null
  completed_at: string | null
}

type SkillProgress = {
  module_id: string
  status: string
}

type Submission = {
  id: number
  team_name: string
  project_title: string
  category: string
  status: string
  score: number | null
  challenge_title: string | null
  day_number: number | null
  created_at: string
  updated_at: string
}

type SubmissionDetail = {
  id: number
  project_title: string
  description: string
  team_name: string
  category: string
  status: string
  score: number | null
  challenge_title: string | null
  challenge_id: number | null
  day_number: number | null
  created_at: string
  updated_at: string
}

type Cached<T> = {
  data: T
  loading: boolean
  error: string
  fetchedAt: number
}

function cached<T>(data: T): Cached<T> {
  return { data, loading: false, error: '', fetchedAt: 0 }
}

function isStale(fetchedAt: number, staleTime = STALE_TIME) {
  return fetchedAt === 0 || Date.now() - fetchedAt > staleTime
}

type AppStore = {
  hackathon: Cached<ActiveHackathon | null>
  challenges: Cached<Challenge[]>
  schedule: Cached<ScheduleEvent[]>
  rules: Cached<Rule[]>
  leaderboard: Cached<LeaderboardEntry[]>
  stats: Cached<DashboardStats | null>
  skillModules: Cached<SkillModule[]>
  skillProgress: Cached<SkillProgress[]>
  submissions: Cached<Submission[]>
  categories: Cached<string[]>
  challengeDetails: Record<string, Cached<ChallengeDetail | null>>
  submissionDetails: Record<string, Cached<SubmissionDetail | null>>

  fetchHackathon: (force?: boolean) => Promise<ActiveHackathon | null>
  fetchChallenges: (force?: boolean) => Promise<Challenge[]>
  fetchSchedule: (force?: boolean) => Promise<ScheduleEvent[]>
  fetchRules: (force?: boolean) => Promise<Rule[]>
  fetchLeaderboard: (force?: boolean) => Promise<LeaderboardEntry[]>
  fetchStats: (force?: boolean) => Promise<DashboardStats | null>
  fetchSkillModules: (force?: boolean) => Promise<SkillModule[]>
  fetchSkillProgress: (force?: boolean) => Promise<SkillProgress[]>
  fetchSubmissions: (force?: boolean) => Promise<Submission[]>
  fetchCategories: (force?: boolean) => Promise<string[]>
  fetchChallengeDetail: (slug: string, force?: boolean) => Promise<ChallengeDetail | null>
  fetchSubmissionDetail: (id: string, force?: boolean) => Promise<SubmissionDetail | null>

  invalidate: (...keys: string[]) => void
}

export type {
  ActiveHackathon,
  Challenge,
  ChallengeDetail,
  ScheduleEvent,
  Rule,
  LeaderboardEntry,
  DashboardStats,
  SkillModule,
  SkillProgress,
  Submission,
  SubmissionDetail,
}

export const useAppStore = create<AppStore>((set, get) => ({
  hackathon: cached(null),
  challenges: cached([]),
  schedule: cached([]),
  rules: cached([]),
  leaderboard: cached([]),
  stats: cached(null),
  skillModules: cached([]),
  skillProgress: cached([]),
  submissions: cached([]),
  categories: cached([]),
  challengeDetails: {},
  submissionDetails: {},

  async fetchHackathon(force) {
    const current = get().hackathon
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ hackathon: { ...current, loading: true } })

    try {
      const data = await apiRequest<ActiveHackathon | null>('/api/hackathons/active', { fallbackData: null })
      set({ hackathon: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load hackathon'
      set({ hackathon: { ...get().hackathon, loading: false, error } })
      return get().hackathon.data
    }
  },

  async fetchChallenges(force) {
    const current = get().challenges
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ challenges: { ...current, loading: true } })

    try {
      const response = await apiRequest<{ items: Challenge[] }>('/api/challenges', { fallbackData: { items: [] } })
      const data = response.items
      set({ challenges: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load challenges'
      set({ challenges: { ...get().challenges, loading: false, error } })
      return get().challenges.data
    }
  },

  async fetchSchedule(force) {
    const current = get().schedule
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ schedule: { ...current, loading: true } })

    try {
      const response = await apiRequest<{ items: ScheduleEvent[] }>('/api/schedule', { fallbackData: { items: [] } })
      const data = response.items
      set({ schedule: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load schedule'
      set({ schedule: { ...get().schedule, loading: false, error } })
      return get().schedule.data
    }
  },

  async fetchRules(force) {
    const current = get().rules
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ rules: { ...current, loading: true } })

    try {
      const response = await apiRequest<{ items: Rule[] }>('/api/rules')
      const data = response.items
      set({ rules: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load rules'
      set({ rules: { ...get().rules, loading: false, error } })
      return get().rules.data
    }
  },

  async fetchLeaderboard(force) {
    const current = get().leaderboard
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ leaderboard: { ...current, loading: true } })

    try {
      const response = await apiRequest<{ items: LeaderboardEntry[] }>('/api/leaderboard')
      const data = response.items
      set({ leaderboard: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load leaderboard'
      set({ leaderboard: { ...get().leaderboard, loading: false, error } })
      return get().leaderboard.data
    }
  },

  async fetchStats(force) {
    const current = get().stats
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ stats: { ...current, loading: true } })

    try {
      const data = await apiRequest<DashboardStats>('/api/me/stats')
      set({ stats: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load stats'
      set({ stats: { ...get().stats, loading: false, error } })
      return get().stats.data
    }
  },

  async fetchSkillModules(force) {
    const current = get().skillModules
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ skillModules: { ...current, loading: true } })

    try {
      const response = await apiRequest<{ items: SkillModule[] }>('/api/skill-modules')
      const data = response.items
      set({ skillModules: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load skill modules'
      set({ skillModules: { ...get().skillModules, loading: false, error } })
      return get().skillModules.data
    }
  },

  async fetchSkillProgress(force) {
    const current = get().skillProgress
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ skillProgress: { ...current, loading: true } })

    try {
      const response = await apiRequest<{ items: SkillProgress[] }>('/api/skill-modules/progress', { fallbackData: { items: [] } })
      const data = response.items
      set({ skillProgress: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load skill progress'
      set({ skillProgress: { ...get().skillProgress, loading: false, error } })
      return get().skillProgress.data
    }
  },

  async fetchSubmissions(force) {
    const current = get().submissions
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ submissions: { ...current, loading: true } })

    try {
      const response = await apiRequest<{ items: Submission[] }>('/api/submissions')
      const data = response.items
      set({ submissions: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load submissions'
      set({ submissions: { ...get().submissions, loading: false, error } })
      return get().submissions.data
    }
  },

  async fetchCategories(force) {
    const current = get().categories
    if (!force && !isStale(current.fetchedAt)) return current.data

    const showLoading = current.fetchedAt === 0
    if (showLoading) set({ categories: { ...current, loading: true } })

    try {
      const response = await apiRequest<{ items: string[] }>('/api/submissions/categories', { fallbackData: { items: [] } })
      const data = response.items
      set({ categories: { data, loading: false, error: '', fetchedAt: Date.now() } })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load categories'
      set({ categories: { ...get().categories, loading: false, error } })
      return get().categories.data
    }
  },

  async fetchChallengeDetail(slug, force) {
    const current = get().challengeDetails[slug]
    if (current && !force && !isStale(current.fetchedAt)) return current.data

    const showLoading = !current || current.fetchedAt === 0
    if (showLoading) {
      set({
        challengeDetails: {
          ...get().challengeDetails,
          [slug]: { data: current?.data ?? null, loading: true, error: '', fetchedAt: current?.fetchedAt ?? 0 },
        },
      })
    }

    try {
      const data = await apiRequest<ChallengeDetail>(`/api/challenges/${slug}`)
      set({
        challengeDetails: {
          ...get().challengeDetails,
          [slug]: { data, loading: false, error: '', fetchedAt: Date.now() },
        },
      })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load challenge'
      set({
        challengeDetails: {
          ...get().challengeDetails,
          [slug]: { data: get().challengeDetails[slug]?.data ?? null, loading: false, error, fetchedAt: get().challengeDetails[slug]?.fetchedAt ?? 0 },
        },
      })
      return get().challengeDetails[slug]?.data ?? null
    }
  },

  async fetchSubmissionDetail(id, force) {
    const current = get().submissionDetails[id]
    if (current && !force && !isStale(current.fetchedAt)) return current.data

    const showLoading = !current || current.fetchedAt === 0
    if (showLoading) {
      set({
        submissionDetails: {
          ...get().submissionDetails,
          [id]: { data: current?.data ?? null, loading: true, error: '', fetchedAt: current?.fetchedAt ?? 0 },
        },
      })
    }

    try {
      const data = await apiRequest<SubmissionDetail>(`/api/submissions/${id}`)
      set({
        submissionDetails: {
          ...get().submissionDetails,
          [id]: { data, loading: false, error: '', fetchedAt: Date.now() },
        },
      })
      return data
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to load submission'
      set({
        submissionDetails: {
          ...get().submissionDetails,
          [id]: { data: get().submissionDetails[id]?.data ?? null, loading: false, error, fetchedAt: get().submissionDetails[id]?.fetchedAt ?? 0 },
        },
      })
      return get().submissionDetails[id]?.data ?? null
    }
  },

  invalidate(...keys) {
    const updates: Partial<AppStore> = {}
    for (const key of keys) {
      const current = get()[key as keyof AppStore]
      if (current && typeof current === 'object' && 'fetchedAt' in (current as Record<string, unknown>)) {
        (updates as Record<string, unknown>)[key] = { ...(current as Record<string, unknown>), fetchedAt: 0 }
      }
    }
    set(updates as Partial<AppStore>)
  },
}))
