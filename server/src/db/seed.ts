import bcrypt from 'bcryptjs'
import type Database from 'better-sqlite3'

type SeedUser = {
  name: string
  email: string
  role: 'admin' | 'participant'
}

const SEEDED_PASSWORD = process.env.SEED_PASSWORD ?? 'admin123'

const seedUsers: SeedUser[] = [
  { name: 'Admin User', email: 'admin@ahp.rw', role: 'admin' },
  { name: 'Ari K', email: 'ari@ahp.rw', role: 'participant' },
  { name: 'Lena M', email: 'lena@ahp.rw', role: 'participant' },
  { name: 'Sam P', email: 'sam@ahp.rw', role: 'participant' },
  { name: 'Noah J', email: 'noah@ahp.rw', role: 'participant' },
  { name: 'Mina R', email: 'mina@ahp.rw', role: 'participant' },
]

function seedUsersTable(db: Database.Database) {
  const passwordHash = bcrypt.hashSync(SEEDED_PASSWORD, 10)
  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      password_hash = excluded.password_hash,
      role = excluded.role
  `)
  for (const user of seedUsers) {
    insertUser.run(user.name, user.email, passwordHash, user.role)
  }
}

function seedHackathon(db: Database.Database): number {
  const existing = db.prepare('SELECT id FROM hackathons WHERE slug = ?').get('aegis-2026') as { id: number } | undefined
  if (existing) return existing.id

  const info = db.prepare(`
    INSERT INTO hackathons (name, slug, description, start_date, end_date, is_active)
    VALUES (?, ?, ?, ?, ?, 1)
  `).run(
    'Aegis Hackathon 2026',
    'aegis-2026',
    'Five days of engineering challenges. Build, optimize, and ship real solutions under time pressure. Solo or team — every submission counts toward the leaderboard.',
    '2026-03-16',
    '2026-03-20',
  )
  return Number(info.lastInsertRowid)
}

function seedChallenges(db: Database.Database, hackathonId: number) {
  const count = (db.prepare('SELECT COUNT(*) as count FROM challenges WHERE hackathon_id = ?').get(hackathonId) as { count: number }).count
  if (count > 0) return

  const insert = db.prepare(`
    INSERT INTO challenges (hackathon_id, day_number, title, slug, difficulty, summary, description, setup_instructions, resources, max_points, unlock_at)
    VALUES (@hackathonId, @dayNumber, @title, @slug, @difficulty, @summary, @description, @setupInstructions, @resources, @maxPoints, @unlockAt)
  `)

  const challenges = [
    {
      hackathonId,
      dayNumber: 1,
      title: 'Data Pipeline',
      slug: 'data-pipeline',
      difficulty: 'easy',
      summary: 'Build a streaming data ingestion pipeline that processes CSV and JSON inputs into a normalized format.',
      description: `Design and implement a data pipeline that reads from multiple input sources (CSV files and JSON API responses), normalizes the data into a common schema, and outputs clean records.\n\nYour pipeline should handle:\n- Malformed rows gracefully (skip and log)\n- Fields with inconsistent types (coerce where possible)\n- Deduplication by a composite key\n- A throughput of at least 10,000 records/second on the test dataset\n\nYou will be evaluated on correctness (50%), throughput (30%), and code quality (20%).`,
      setupInstructions: `## Environment\n\n- Node.js 20+ or Python 3.12+\n- No external databases required\n\n## Getting Started\n\n1. Clone the starter repo: \`git clone https://github.com/aegis-hackathon/day1-starter\`\n2. Install dependencies: \`npm install\` or \`pip install -r requirements.txt\`\n3. Run the test suite: \`npm test\` or \`pytest\`\n4. The input files are in \`data/input/\` — do not modify them\n5. Write your output to \`data/output/normalized.json\`\n\n## Submission\n\nSubmit your solution through the platform. Include a brief description of your approach and any trade-offs you made.`,
      resources: JSON.stringify([
        { title: 'Node.js Streams Documentation', url: 'https://nodejs.org/api/stream.html', type: 'docs' },
        { title: 'Papa Parse — CSV Parser', url: 'https://www.papaparse.com/', type: 'library' },
        { title: 'Starter Repository', url: 'https://github.com/aegis-hackathon/day1-starter', type: 'repo' },
        { title: 'JSON Schema Spec', url: 'https://json-schema.org/understanding-json-schema/', type: 'reference' },
      ]),
      maxPoints: 100,
      unlockAt: '2026-03-16T09:00:00Z',
    },
    {
      hackathonId,
      dayNumber: 2,
      title: 'API Gateway',
      slug: 'api-gateway',
      difficulty: 'medium',
      summary: 'Design a lightweight API gateway with rate limiting, request routing, and circuit breaker patterns.',
      description: `Build an API gateway that sits in front of three mock backend services and provides:\n\n- **Request routing** — route \`/users/*\` to Service A, \`/products/*\` to Service B, \`/orders/*\` to Service C\n- **Rate limiting** — 100 requests per minute per API key (sliding window)\n- **Circuit breaker** — if a backend returns 5xx errors 5 times in 30 seconds, open the circuit for 60 seconds and return 503\n- **Request logging** — log method, path, status code, and latency for every request\n\nMock backends are provided as Docker containers. Your gateway must pass the integration test suite.\n\nScoring: correctness (40%), resilience (30%), latency overhead (20%), code quality (10%).`,
      setupInstructions: `## Environment\n\n- Docker and Docker Compose required\n- Language: any (Node.js, Go, Python, Rust recommended)\n\n## Getting Started\n\n1. Clone: \`git clone https://github.com/aegis-hackathon/day2-starter\`\n2. Start mock backends: \`docker compose up -d backends\`\n3. Backends will be on ports 4001, 4002, 4003\n4. Your gateway should listen on port 8080\n5. Run tests: \`npm run test:integration\`\n\n## Hints\n\n- Start with routing, then add rate limiting, then circuit breaker\n- Use in-memory stores — no Redis required\n- The test suite sends ~500 requests in burst patterns`,
      resources: JSON.stringify([
        { title: 'Circuit Breaker Pattern', url: 'https://martinfowler.com/bliki/CircuitBreaker.html', type: 'article' },
        { title: 'Rate Limiting Algorithms', url: 'https://blog.cloudflare.com/counting-things-a-lot-of-different-things/', type: 'article' },
        { title: 'Starter Repository', url: 'https://github.com/aegis-hackathon/day2-starter', type: 'repo' },
        { title: 'Docker Compose Docs', url: 'https://docs.docker.com/compose/', type: 'docs' },
      ]),
      maxPoints: 150,
      unlockAt: '2026-03-17T09:00:00Z',
    },
    {
      hackathonId,
      dayNumber: 3,
      title: 'Real-time Dashboard',
      slug: 'realtime-dashboard',
      difficulty: 'medium',
      summary: 'Create a live metrics dashboard that consumes a WebSocket event stream and renders charts in real time.',
      description: `Build a browser-based dashboard that connects to a WebSocket server streaming simulated IoT sensor data and renders:\n\n- **Line chart** — temperature over time (last 5 minutes, auto-scrolling)\n- **Bar chart** — event count by sensor type (updated every second)\n- **Status panel** — current value + trend arrow (up/down/stable) for each sensor\n- **Alert log** — list of threshold violations (temp > 80°C or humidity > 95%)\n\nThe WebSocket server sends ~50 events/second. Your dashboard must not drop frames below 30fps.\n\nScoring: visual quality (30%), real-time accuracy (30%), performance (25%), code quality (15%).`,
      setupInstructions: `## Environment\n\n- Node.js 20+ for the WebSocket server\n- Browser-based frontend (any framework or vanilla JS)\n\n## Getting Started\n\n1. Clone: \`git clone https://github.com/aegis-hackathon/day3-starter\`\n2. Start the event server: \`npm run server\`\n3. WebSocket endpoint: \`ws://localhost:4040/events\`\n4. Event format: \`{ "sensorId": "temp-01", "type": "temperature", "value": 72.3, "ts": 1710590400000 }\`\n5. Open \`index.html\` in your browser to start building\n\n## Tips\n\n- Consider using Canvas or SVG for charts\n- Batch DOM updates to maintain 30fps\n- The server supports \`?rate=10\` query param for slower testing`,
      resources: JSON.stringify([
        { title: 'Chart.js — Simple Charts', url: 'https://www.chartjs.org/', type: 'library' },
        { title: 'D3.js — Data Visualization', url: 'https://d3js.org/', type: 'library' },
        { title: 'Starter Repository', url: 'https://github.com/aegis-hackathon/day3-starter', type: 'repo' },
        { title: 'WebSocket API (MDN)', url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSocket', type: 'docs' },
      ]),
      maxPoints: 150,
      unlockAt: '2026-03-18T09:00:00Z',
    },
    {
      hackathonId,
      dayNumber: 4,
      title: 'Security Audit',
      slug: 'security-audit',
      difficulty: 'hard',
      summary: 'Find and fix security vulnerabilities in a deliberately flawed Express.js application.',
      description: `You receive a "production" Express.js + SQLite application with at least 8 intentional security vulnerabilities. Your job:\n\n1. **Identify** each vulnerability (type, location, severity)\n2. **Exploit** it with a proof-of-concept (curl command or script)\n3. **Fix** it with a minimal, correct patch\n4. **Document** each finding in the provided report template\n\nVulnerability categories include: SQL injection, XSS, CSRF, insecure authentication, path traversal, information disclosure, missing rate limiting, and insecure deserialization.\n\nScoring: findings identified (40%), exploits demonstrated (25%), fixes correct (25%), report quality (10%).`,
      setupInstructions: `## Environment\n\n- Node.js 20+\n- SQLite (bundled)\n\n## Getting Started\n\n1. Clone: \`git clone https://github.com/aegis-hackathon/day4-starter\`\n2. Install: \`npm install\`\n3. Start the vulnerable app: \`npm start\` (runs on port 5000)\n4. The app has a login page, user profiles, a file upload feature, and an admin panel\n5. Default credentials: \`user@test.com\` / \`password123\`\n\n## Report Format\n\nUse \`REPORT.md\` in the repo root. For each finding:\n- **ID**: VULN-001, VULN-002, etc.\n- **Type**: e.g., SQL Injection\n- **Location**: file and line number\n- **Severity**: Critical / High / Medium / Low\n- **Exploit**: curl command or script\n- **Fix**: diff or description`,
      resources: JSON.stringify([
        { title: 'OWASP Top 10', url: 'https://owasp.org/www-project-top-ten/', type: 'reference' },
        { title: 'Node.js Security Checklist', url: 'https://blog.risingstack.com/node-js-security-checklist/', type: 'article' },
        { title: 'Starter Repository', url: 'https://github.com/aegis-hackathon/day4-starter', type: 'repo' },
        { title: 'SQLite Injection Cheat Sheet', url: 'https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/SQL%20Injection/SQLite%20Injection', type: 'reference' },
      ]),
      maxPoints: 200,
      unlockAt: '2026-03-19T09:00:00Z',
    },
    {
      hackathonId,
      dayNumber: 5,
      title: 'System Design',
      slug: 'system-design',
      difficulty: 'hard',
      summary: 'Design and prototype a scalable URL shortener handling 10K requests/second with analytics.',
      description: `Design and build a URL shortener service that:\n\n- **Shortens URLs** — \`POST /shorten\` accepts a long URL and returns a short code\n- **Redirects** — \`GET /:code\` redirects to the original URL (301)\n- **Analytics** — \`GET /:code/stats\` returns click count, referrers, and time series (hourly buckets)\n- **Handles load** — must sustain 10,000 requests/second on the redirect path (measured via \`wrk\`)\n\nYou must also submit a one-page architecture document explaining:\n- Data model and storage choices\n- Caching strategy\n- How you would scale to 1M req/s\n- Trade-offs made for the hackathon timeframe\n\nScoring: working prototype (35%), load test results (25%), architecture document (25%), code quality (15%).`,
      setupInstructions: `## Environment\n\n- Language: any\n- You may use Redis, SQLite, or in-memory storage\n- \`wrk\` is pre-installed for load testing\n\n## Getting Started\n\n1. Clone: \`git clone https://github.com/aegis-hackathon/day5-starter\`\n2. The starter includes a \`wrk\` script and test harness\n3. Your service should listen on port 8080\n4. Run load test: \`./bench.sh\` (uses wrk with 4 threads, 100 connections, 30s)\n5. Architecture doc goes in \`ARCHITECTURE.md\`\n\n## Constraints\n\n- Short codes must be 6-8 characters, URL-safe\n- No external URL shortening APIs\n- Custom short codes are a bonus feature`,
      resources: JSON.stringify([
        { title: 'System Design Primer', url: 'https://github.com/donnemartin/system-design-primer', type: 'reference' },
        { title: 'wrk — HTTP Benchmarking Tool', url: 'https://github.com/wg/wrk', type: 'tool' },
        { title: 'Starter Repository', url: 'https://github.com/aegis-hackathon/day5-starter', type: 'repo' },
        { title: 'Base62 Encoding', url: 'https://en.wikipedia.org/wiki/Base62', type: 'reference' },
      ]),
      maxPoints: 200,
      unlockAt: '2026-03-20T09:00:00Z',
    },
  ]

  for (const c of challenges) {
    insert.run(c)
  }
}

function seedScheduleEvents(db: Database.Database, hackathonId: number) {
  const count = (db.prepare('SELECT COUNT(*) as count FROM schedule_events WHERE hackathon_id = ?').get(hackathonId) as { count: number }).count
  if (count > 0) return

  const insert = db.prepare(`
    INSERT INTO schedule_events (hackathon_id, day_number, time, title, venue, sort_order)
    VALUES (?, ?, ?, ?, ?, ?)
  `)

  const events = [
    [1, '08:30', 'Registration & Check-in', 'Main Hall', 1],
    [1, '09:00', 'Opening Keynote', 'Auditorium', 2],
    [1, '09:30', 'Challenge 1 Unlocks — Data Pipeline', 'Challenge Board', 3],
    [1, '12:00', 'Lunch Break', 'Courtyard', 4],
    [1, '13:00', 'Workshop: Effective Debugging', 'Room A', 5],
    [1, '17:00', 'Day 1 Submissions Due', 'Challenge Board', 6],
    [2, '09:00', 'Challenge 2 Unlocks — API Gateway', 'Challenge Board', 1],
    [2, '10:30', 'Workshop: API Design Patterns', 'Room B', 2],
    [2, '12:00', 'Lunch Break', 'Courtyard', 3],
    [2, '14:00', 'Mentor Office Hours', 'Room A', 4],
    [2, '17:00', 'Day 2 Submissions Due', 'Challenge Board', 5],
    [3, '09:00', 'Challenge 3 Unlocks — Real-time Dashboard', 'Challenge Board', 1],
    [3, '10:30', 'Workshop: Data Visualization', 'Room B', 2],
    [3, '12:00', 'Lunch Break', 'Courtyard', 3],
    [3, '15:00', 'Team Check-ins', 'Main Hall', 4],
    [3, '17:00', 'Day 3 Submissions Due', 'Challenge Board', 5],
    [4, '09:00', 'Challenge 4 Unlocks — Security Audit', 'Challenge Board', 1],
    [4, '10:00', 'Workshop: Common Vulnerability Patterns', 'Room A', 2],
    [4, '12:00', 'Lunch Break', 'Courtyard', 3],
    [4, '14:00', 'Lightning Talks', 'Auditorium', 4],
    [4, '17:00', 'Day 4 Submissions Due', 'Challenge Board', 5],
    [5, '09:00', 'Challenge 5 Unlocks — System Design', 'Challenge Board', 1],
    [5, '11:00', 'Workshop: Load Testing & Profiling', 'Room B', 2],
    [5, '12:00', 'Lunch Break', 'Courtyard', 3],
    [5, '15:00', 'Final Submissions Due', 'Challenge Board', 4],
    [5, '16:00', 'Judging & Deliberation', 'Main Hall', 5],
    [5, '17:30', 'Awards Ceremony & Closing', 'Auditorium', 6],
  ]

  for (const [day, time, title, venue, order] of events) {
    insert.run(hackathonId, day, time, title, venue, order)
  }
}

function seedRules(db: Database.Database, hackathonId: number) {
  const count = (db.prepare('SELECT COUNT(*) as count FROM rules WHERE hackathon_id = ?').get(hackathonId) as { count: number }).count
  if (count > 0) return

  const insert = db.prepare(`
    INSERT INTO rules (hackathon_id, title, body, sort_order)
    VALUES (?, ?, ?, ?)
  `)

  const rulesList = [
    ['One account per participant', 'Each participant must register with a unique email address. Sharing accounts is not permitted and will result in disqualification.', 1],
    ['Team size', 'Teams may have 1 to 4 members. You may participate solo. Team composition is locked after the first submission.', 2],
    ['Submission format', 'Submit through the platform before each daily deadline. Include a description of your approach, any trade-offs, and links to your code repository.', 3],
    ['Original work only', 'All code must be written during the hackathon. You may use open-source libraries and frameworks, but the core solution must be your own. AI assistants (Copilot, ChatGPT, etc.) are allowed as tools.', 4],
    ['Scoring criteria', 'Each challenge specifies its own scoring breakdown. Common factors: correctness, performance, code quality, and documentation. Partial credit is awarded.', 5],
    ['Daily deadlines', 'Challenges unlock at 09:00 and submissions close at 17:00 the same day. Late submissions are accepted with a 20% point penalty per hour.', 6],
    ['Code of conduct', 'Be respectful, inclusive, and constructive. Harassment, plagiarism, or deliberate sabotage of other teams will result in immediate disqualification.', 7],
    ['Disputes and judging', 'Judges\' decisions are final. If you believe there is a scoring error, submit a dispute through the platform within 1 hour of results being posted.', 8],
  ]

  for (const [title, body, order] of rulesList) {
    insert.run(hackathonId, title, body, order)
  }
}

function seedSkillModules(db: Database.Database, hackathonId: number) {
  const count = (db.prepare('SELECT COUNT(*) as count FROM skill_modules WHERE hackathon_id = ?').get(hackathonId) as { count: number }).count
  if (count > 0) return

  const insert = db.prepare(`
    INSERT INTO skill_modules (id, hackathon_id, title, description, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `)

  const modules = [
    ['api-design', 'API Design', 'RESTful API design principles, versioning, error handling, and documentation with OpenAPI.', 1],
    ['data-modeling', 'Data Modeling', 'Relational and document database schema design, normalization, indexing strategies, and query optimization.', 2],
    ['testing', 'Testing Strategies', 'Unit testing, integration testing, load testing, and test-driven development workflows.', 3],
    ['security-fundamentals', 'Security Fundamentals', 'Authentication patterns, input validation, OWASP Top 10, and secure coding practices.', 4],
    ['system-design', 'System Design', 'Scalability patterns, caching strategies, load balancing, and distributed system trade-offs.', 5],
  ]

  for (const [id, title, description, order] of modules) {
    insert.run(id, hackathonId, title, description, order)
  }
}

function seedTeams(db: Database.Database, hackathonId: number, usersByEmail: Map<string, number>) {
  const count = (db.prepare('SELECT COUNT(*) as count FROM teams WHERE hackathon_id = ?').get(hackathonId) as { count: number }).count
  if (count > 0) return

  const insertTeam = db.prepare(`
    INSERT INTO teams (hackathon_id, name, created_by)
    VALUES (?, ?, ?)
  `)
  const insertMember = db.prepare(`
    INSERT INTO team_members (team_id, user_id, role)
    VALUES (?, ?, ?)
  `)

  const teamDefs = [
    { name: 'Nova Forge', leader: 'ari@ahp.rw', members: ['noah@ahp.rw'] },
    { name: 'Green Pulse', leader: 'lena@ahp.rw', members: ['mina@ahp.rw'] },
    { name: 'Signal 9', leader: 'sam@ahp.rw', members: [] },
  ]

  for (const def of teamDefs) {
    const leaderId = usersByEmail.get(def.leader)
    if (!leaderId) continue

    const info = insertTeam.run(hackathonId, def.name, leaderId)
    const teamId = Number(info.lastInsertRowid)
    insertMember.run(teamId, leaderId, 'leader')

    for (const memberEmail of def.members) {
      const memberId = usersByEmail.get(memberEmail)
      if (memberId) {
        insertMember.run(teamId, memberId, 'member')
      }
    }
  }
}

function seedSubmissions(db: Database.Database, hackathonId: number, usersByEmail: Map<string, number>) {
  const challenges = db.prepare('SELECT id, day_number FROM challenges WHERE hackathon_id = ?').all(hackathonId) as Array<{ id: number; day_number: number }>
  const challengeByDay = new Map(challenges.map((c) => [c.day_number, c.id]))

  const teams = db.prepare('SELECT id, name FROM teams WHERE hackathon_id = ?').all(hackathonId) as Array<{ id: number; name: string }>
  const teamByName = new Map(teams.map((t) => [t.name, t.id]))

  const countByLocalId = db.prepare('SELECT COUNT(*) as count FROM submissions WHERE local_id = ?')
  const insertSubmission = db.prepare(`
    INSERT INTO submissions
      (user_id, local_id, team_id, team_name, challenge_id, project_title, description, category, status, score, version, created_at, updated_at)
    VALUES
      (@userId, @localId, @teamId, @teamName, @challengeId, @projectTitle, @description, @category, @status, @score, @version, datetime('now', @daysAgo), datetime('now'))
  `)

  const submissionTemplates = [
    {
      email: 'ari@ahp.rw',
      localId: 'seed-local-1',
      teamName: 'Nova Forge',
      day: 1,
      title: 'Stream-based CSV/JSON normalizer',
      description: 'Node.js streaming pipeline using Transform streams. Handles 15K records/sec with dedup via composite hash map. Skips malformed rows with structured error logging.',
      category: 'Algorithm',
      status: 'reviewed',
      score: 88,
      version: 2,
      daysAgo: '-4 day',
    },
    {
      email: 'lena@ahp.rw',
      localId: 'seed-local-2',
      teamName: 'Green Pulse',
      day: 2,
      title: 'Express gateway with sliding window limiter',
      description: 'Lightweight Express-based gateway with in-memory sliding window rate limiter and circuit breaker. Routes requests to three backends with <5ms overhead.',
      category: 'Optimization',
      status: 'reviewed',
      score: 92,
      version: 3,
      daysAgo: '-3 day',
    },
    {
      email: 'sam@ahp.rw',
      localId: 'seed-local-3',
      teamName: 'Signal 9',
      day: 1,
      title: 'Parallel CSV parser with worker threads',
      description: 'Multi-threaded CSV parser using Node.js worker_threads. Splits input into chunks and processes in parallel. Achieves 22K records/sec on test data.',
      category: 'Algorithm',
      status: 'reviewed',
      score: 78,
      version: 1,
      daysAgo: '-4 day',
    },
    {
      email: 'ari@ahp.rw',
      localId: 'seed-local-4',
      teamName: 'Nova Forge',
      day: 2,
      title: 'Go reverse proxy with circuit breaker',
      description: 'Go-based reverse proxy using goroutines for concurrent request handling. Implements token bucket rate limiting and exponential backoff circuit breaker.',
      category: 'Systems',
      status: 'reviewed',
      score: 85,
      version: 1,
      daysAgo: '-3 day',
    },
    {
      email: 'lena@ahp.rw',
      localId: 'seed-local-5',
      teamName: 'Green Pulse',
      day: 1,
      title: 'Python pandas pipeline with validation',
      description: 'Pandas-based pipeline with schema validation using pydantic. Processes 12K records/sec with detailed error reports and duplicate detection.',
      category: 'Algorithm',
      status: 'reviewed',
      score: 72,
      version: 1,
      daysAgo: '-4 day',
    },
    {
      email: 'noah@ahp.rw',
      localId: 'seed-local-6',
      teamName: 'Nova Forge',
      day: 3,
      title: 'Canvas-based real-time sensor dashboard',
      description: 'Pure Canvas dashboard with requestAnimationFrame loop. Renders line charts, bar charts, and alert log at 60fps. Uses ring buffer for time-series data.',
      category: 'Visualization',
      status: 'submitted',
      score: null,
      version: 1,
      daysAgo: '-2 day',
    },
    {
      email: 'mina@ahp.rw',
      localId: 'seed-local-7',
      teamName: 'Green Pulse',
      day: 3,
      title: 'D3.js dashboard with WebSocket reconnect',
      description: 'D3.js-powered dashboard with automatic WebSocket reconnection and data replay. SVG charts with smooth transitions and threshold-based alerting.',
      category: 'Visualization',
      status: 'submitted',
      score: null,
      version: 1,
      daysAgo: '-2 day',
    },
  ]

  for (const item of submissionTemplates) {
    const userId = usersByEmail.get(item.email)
    if (!userId) continue

    const existing = countByLocalId.get(item.localId) as { count: number }
    if (existing.count > 0) continue

    insertSubmission.run({
      userId,
      localId: item.localId,
      teamId: teamByName.get(item.teamName) ?? null,
      teamName: item.teamName,
      challengeId: challengeByDay.get(item.day) ?? null,
      projectTitle: item.title,
      description: item.description,
      category: item.category,
      status: item.status,
      score: item.score,
      version: item.version,
      daysAgo: item.daysAgo,
    })
  }
}

function seedSkillProgress(db: Database.Database, seededUsers: Array<{ id: number; email: string }>) {
  const modules = ['api-design', 'data-modeling', 'testing', 'security-fundamentals', 'system-design']
  const insertProgress = db.prepare(`
    INSERT INTO skill_progress (user_id, module_id, status, completed_at, version, updated_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(user_id, module_id) DO UPDATE SET
      status = excluded.status,
      completed_at = excluded.completed_at,
      version = excluded.version,
      updated_at = excluded.updated_at
  `)

  const progressMap: Record<string, Record<string, 'completed' | 'in_progress'>> = {
    'ari@ahp.rw': { 'api-design': 'completed', 'data-modeling': 'completed', 'testing': 'in_progress', 'security-fundamentals': 'in_progress', 'system-design': 'in_progress' },
    'lena@ahp.rw': { 'api-design': 'completed', 'data-modeling': 'in_progress', 'testing': 'completed', 'security-fundamentals': 'in_progress', 'system-design': 'in_progress' },
    'sam@ahp.rw': { 'api-design': 'completed', 'data-modeling': 'completed', 'testing': 'completed', 'security-fundamentals': 'in_progress', 'system-design': 'in_progress' },
    'noah@ahp.rw': { 'api-design': 'in_progress', 'data-modeling': 'in_progress', 'testing': 'in_progress', 'security-fundamentals': 'in_progress', 'system-design': 'in_progress' },
    'mina@ahp.rw': { 'api-design': 'completed', 'data-modeling': 'completed', 'testing': 'in_progress', 'security-fundamentals': 'completed', 'system-design': 'in_progress' },
  }

  for (const user of seededUsers) {
    if (user.email === 'admin@ahp.rw') continue
    const userProgress = progressMap[user.email]
    if (!userProgress) continue

    for (const moduleId of modules) {
      const status = userProgress[moduleId] ?? 'in_progress'
      const completedAt = status === 'completed' ? new Date().toISOString() : null
      const version = status === 'completed' ? 2 : 1
      insertProgress.run(user.id, moduleId, status, completedAt, version)
    }
  }
}

function seedSyncLog(db: Database.Database, usersByEmail: Map<string, number>) {
  const logCount = (db.prepare('SELECT COUNT(*) as count FROM sync_log').get() as { count: number }).count
  if (logCount > 0) return

  const insertSyncLog = db.prepare(`
    INSERT INTO sync_log (user_id, action, entity_type, entity_id, status)
    VALUES (?, ?, ?, ?, ?)
  `)

  insertSyncLog.run(usersByEmail.get('ari@ahp.rw') ?? null, 'submission', 'submission', 'seed-local-1', 'success')
  insertSyncLog.run(usersByEmail.get('lena@ahp.rw') ?? null, 'submission', 'submission', 'seed-local-2', 'success')
  insertSyncLog.run(usersByEmail.get('sam@ahp.rw') ?? null, 'submission', 'submission', 'seed-local-3', 'success')
  insertSyncLog.run(usersByEmail.get('ari@ahp.rw') ?? null, 'submission', 'submission', 'seed-local-4', 'success')
  insertSyncLog.run(usersByEmail.get('lena@ahp.rw') ?? null, 'submission', 'submission', 'seed-local-5', 'success')
  insertSyncLog.run(usersByEmail.get('noah@ahp.rw') ?? null, 'submission', 'submission', 'seed-local-6', 'success')
  insertSyncLog.run(usersByEmail.get('mina@ahp.rw') ?? null, 'submission', 'submission', 'seed-local-7', 'success')
}

export function ensureSeedData(db: Database.Database) {
  const env = process.env.NODE_ENV
  if (env === 'test' || env === 'production') {
    return
  }

  seedUsersTable(db)

  const hackathonId = seedHackathon(db)

  const seededUsers = db
    .prepare('SELECT id, email FROM users WHERE email LIKE ?')
    .all('%@ahp.rw') as Array<{ id: number; email: string }>
  const usersByEmail = new Map(seededUsers.map((user) => [user.email, user.id]))

  seedChallenges(db, hackathonId)
  seedScheduleEvents(db, hackathonId)
  seedRules(db, hackathonId)
  seedSkillModules(db, hackathonId)
  seedTeams(db, hackathonId, usersByEmail)
  seedSubmissions(db, hackathonId, usersByEmail)
  seedSkillProgress(db, seededUsers)
  seedSyncLog(db, usersByEmail)
}
