export type SubmissionStatus = 'Submitted' | 'Reviewed' | 'Needs Fix'

export type AdminSubmissionRecord = {
  id: string
  team: string
  userName: string
  projectTitle: string
  challengeTitle: string | null
  dayNumber: number | null
  category: string
  status: SubmissionStatus
  submittedAt: string
  score: number | null
}
