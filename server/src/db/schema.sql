CREATE SCHEMA IF NOT EXISTS neon_auth;

CREATE TABLE IF NOT EXISTS neon_auth.users_sync (
  id uuid PRIMARY KEY,
  name text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES neon_auth.users_sync (id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'participant',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hackathons (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL DEFAULT '',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  team_size_min integer NOT NULL DEFAULT 1,
  team_size_max integer NOT NULL DEFAULT 4,
  late_policy text NOT NULL DEFAULT 'accept_with_penalty',
  late_penalty_percent_per_hour integer NOT NULL DEFAULT 20,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS challenges (
  id serial PRIMARY KEY,
  hackathon_id integer NOT NULL REFERENCES hackathons (id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  title text NOT NULL,
  slug text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  summary text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  setup_instructions text NOT NULL DEFAULT '',
  resources text NOT NULL DEFAULT '[]',
  max_points integer NOT NULL DEFAULT 100,
  unlock_at timestamptz,
  submission_deadline_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hackathon_id, day_number)
);

CREATE TABLE IF NOT EXISTS teams (
  id serial PRIMARY KEY,
  hackathon_id integer NOT NULL REFERENCES hackathons (id) ON DELETE CASCADE,
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES neon_auth.users_sync (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (hackathon_id, name)
);

CREATE TABLE IF NOT EXISTS team_members (
  id serial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES neon_auth.users_sync (id),
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS team_join_requests (
  id serial PRIMARY KEY,
  team_id integer NOT NULL REFERENCES teams (id) ON DELETE CASCADE,
  requester_user_id uuid NOT NULL REFERENCES neon_auth.users_sync (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  message text NOT NULL DEFAULT '',
  reviewed_by uuid REFERENCES neon_auth.users_sync (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE TABLE IF NOT EXISTS schedule_events (
  id serial PRIMARY KEY,
  hackathon_id integer NOT NULL REFERENCES hackathons (id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  time text NOT NULL,
  title text NOT NULL,
  venue text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS rules (
  id serial PRIMARY KEY,
  hackathon_id integer NOT NULL REFERENCES hackathons (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS skill_modules (
  id text NOT NULL,
  hackathon_id integer NOT NULL REFERENCES hackathons (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (id, hackathon_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES neon_auth.users_sync (id),
  local_id text,
  team_id integer REFERENCES teams (id),
  team_name text NOT NULL DEFAULT '',
  challenge_id integer REFERENCES challenges (id),
  project_title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  status text NOT NULL DEFAULT 'submitted',
  score integer,
  raw_score integer,
  penalty_percent integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submission_media (
  id serial PRIMARY KEY,
  submission_id integer NOT NULL REFERENCES submissions (id) ON DELETE CASCADE,
  local_id text,
  file_path text NOT NULL,
  file_type text,
  chunk_status text NOT NULL DEFAULT 'complete',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_progress (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES neon_auth.users_sync (id),
  module_id text NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  completed_at timestamptz,
  version integer NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id serial PRIMARY KEY,
  user_id uuid REFERENCES neon_auth.users_sync (id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  error_message text
);

CREATE INDEX IF NOT EXISTS idx_challenges_hackathon_id ON challenges (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_hackathon_id ON schedule_events (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_rules_hackathon_id ON rules (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id ON teams (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id ON team_join_requests (team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_requester_user_id ON team_join_requests (requester_user_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_status ON team_join_requests (status);
CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON submissions (team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON submissions (challenge_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user_id ON sync_log (user_id);
