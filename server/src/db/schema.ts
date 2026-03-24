import { pgTable, pgSchema, serial, text, integer, boolean, timestamp, uuid, unique, index, primaryKey } from 'drizzle-orm/pg-core'

const neonAuth = pgSchema('neon_auth')

export const neonAuthUsersSync = neonAuth.table('users_sync', {
  id: uuid('id').primaryKey(),
  name: text('name'),
  email: text('email'),
  createdAt: timestamp('created_at', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
})

export const userProfiles = pgTable('user_profiles', {
  userId: uuid('user_id').primaryKey().references(() => neonAuthUsersSync.id, { onDelete: 'cascade' }),
  displayName: text('display_name').notNull().default(''),
  role: text('role').notNull().default('participant'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const hackathons = pgTable('hackathons', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull().default(''),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  isActive: boolean('is_active').notNull().default(false),
  teamSizeMin: integer('team_size_min').notNull().default(1),
  teamSizeMax: integer('team_size_max').notNull().default(4),
  latePolicy: text('late_policy').notNull().default('accept_with_penalty'),
  latePenaltyPercentPerHour: integer('late_penalty_percent_per_hour').notNull().default(20),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const challenges = pgTable('challenges', {
  id: serial('id').primaryKey(),
  hackathonId: integer('hackathon_id').notNull().references(() => hackathons.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  title: text('title').notNull(),
  slug: text('slug').notNull(),
  difficulty: text('difficulty').notNull().default('medium'),
  summary: text('summary').notNull().default(''),
  description: text('description').notNull().default(''),
  setupInstructions: text('setup_instructions').notNull().default(''),
  resources: text('resources').notNull().default('[]'),
  maxPoints: integer('max_points').notNull().default(100),
  unlockAt: timestamp('unlock_at', { withTimezone: true }),
  submissionDeadlineAt: timestamp('submission_deadline_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.hackathonId, t.dayNumber),
  index('idx_challenges_hackathon_id').on(t.hackathonId),
])

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  hackathonId: integer('hackathon_id').notNull().references(() => hackathons.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdBy: uuid('created_by').notNull().references(() => neonAuthUsersSync.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.hackathonId, t.name),
  index('idx_teams_hackathon_id').on(t.hackathonId),
])

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => neonAuthUsersSync.id),
  role: text('role').notNull().default('member'),
  joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.teamId, t.userId),
  index('idx_team_members_user_id').on(t.userId),
  index('idx_team_members_team_id').on(t.teamId),
])

export const teamJoinRequests = pgTable('team_join_requests', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
  requesterUserId: uuid('requester_user_id').notNull().references(() => neonAuthUsersSync.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('pending'),
  message: text('message').notNull().default(''),
  reviewedBy: uuid('reviewed_by').references(() => neonAuthUsersSync.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
}, (t) => [
  index('idx_team_join_requests_team_id').on(t.teamId),
  index('idx_team_join_requests_requester_user_id').on(t.requesterUserId),
  index('idx_team_join_requests_status').on(t.status),
])

export const scheduleEvents = pgTable('schedule_events', {
  id: serial('id').primaryKey(),
  hackathonId: integer('hackathon_id').notNull().references(() => hackathons.id, { onDelete: 'cascade' }),
  dayNumber: integer('day_number').notNull(),
  time: text('time').notNull(),
  title: text('title').notNull(),
  venue: text('venue').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('idx_schedule_events_hackathon_id').on(t.hackathonId),
])

export const rules = pgTable('rules', {
  id: serial('id').primaryKey(),
  hackathonId: integer('hackathon_id').notNull().references(() => hackathons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  index('idx_rules_hackathon_id').on(t.hackathonId),
])

export const skillModules = pgTable('skill_modules', {
  id: text('id').notNull(),
  hackathonId: integer('hackathon_id').notNull().references(() => hackathons.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
}, (t) => [
  primaryKey({ columns: [t.id, t.hackathonId] }),
])

export const submissions = pgTable('submissions', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => neonAuthUsersSync.id),
  localId: text('local_id'),
  teamId: integer('team_id').references(() => teams.id),
  teamName: text('team_name').notNull().default(''),
  challengeId: integer('challenge_id').references(() => challenges.id),
  projectTitle: text('project_title').notNull(),
  description: text('description').notNull(),
  category: text('category').notNull(),
  status: text('status').notNull().default('submitted'),
  score: integer('score'),
  rawScore: integer('raw_score'),
  penaltyPercent: integer('penalty_percent').notNull().default(0),
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('idx_submissions_user_id').on(t.userId),
  index('idx_submissions_team_id').on(t.teamId),
  index('idx_submissions_challenge_id').on(t.challengeId),
])

export const submissionMedia = pgTable('submission_media', {
  id: serial('id').primaryKey(),
  submissionId: integer('submission_id').notNull().references(() => submissions.id, { onDelete: 'cascade' }),
  localId: text('local_id'),
  filePath: text('file_path').notNull(),
  fileType: text('file_type'),
  chunkStatus: text('chunk_status').notNull().default('complete'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const skillProgress = pgTable('skill_progress', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').notNull().references(() => neonAuthUsersSync.id),
  moduleId: text('module_id').notNull(),
  status: text('status').notNull().default('in_progress'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  version: integer('version').notNull().default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  unique().on(t.userId, t.moduleId),
])

export const syncLog = pgTable('sync_log', {
  id: serial('id').primaryKey(),
  userId: uuid('user_id').references(() => neonAuthUsersSync.id, { onDelete: 'set null' }),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  status: text('status').notNull(),
  errorMessage: text('error_message'),
}, (t) => [
  index('idx_sync_log_user_id').on(t.userId),
])
