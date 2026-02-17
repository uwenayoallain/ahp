PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'participant',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS hackathons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hackathon_id INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  setup_instructions TEXT NOT NULL DEFAULT '',
  resources TEXT NOT NULL DEFAULT '[]',
  max_points INTEGER NOT NULL DEFAULT 100,
  unlock_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hackathon_id, day_number),
  FOREIGN KEY (hackathon_id) REFERENCES hackathons (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS teams (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hackathon_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  created_by INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(hackathon_id, name),
  FOREIGN KEY (hackathon_id) REFERENCES hackathons (id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(team_id, user_id),
  FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS schedule_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hackathon_id INTEGER NOT NULL,
  day_number INTEGER NOT NULL,
  time TEXT NOT NULL,
  title TEXT NOT NULL,
  venue TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (hackathon_id) REFERENCES hackathons (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  hackathon_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (hackathon_id) REFERENCES hackathons (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_modules (
  id TEXT NOT NULL,
  hackathon_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (id, hackathon_id),
  FOREIGN KEY (hackathon_id) REFERENCES hackathons (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  local_id TEXT,
  team_id INTEGER,
  team_name TEXT NOT NULL,
  challenge_id INTEGER,
  project_title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  score INTEGER,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id),
  FOREIGN KEY (team_id) REFERENCES teams (id),
  FOREIGN KEY (challenge_id) REFERENCES challenges (id)
);

CREATE TABLE IF NOT EXISTS submission_media (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  submission_id INTEGER NOT NULL,
  local_id TEXT,
  file_path TEXT NOT NULL,
  file_type TEXT,
  chunk_status TEXT NOT NULL DEFAULT 'complete',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (submission_id) REFERENCES submissions (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS skill_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  module_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  completed_at TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, module_id),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL,
  error_message TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_submissions_user_id ON submissions (user_id);
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON submissions (team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_challenge_id ON submissions (challenge_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members (user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members (team_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_user_id ON sync_log (user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_events_hackathon_id ON schedule_events (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_rules_hackathon_id ON rules (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_challenges_hackathon_id ON challenges (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_teams_hackathon_id ON teams (hackathon_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
