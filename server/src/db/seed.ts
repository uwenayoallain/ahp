import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { getDb } from './connection.js'
import {
  challenges,
  hackathons,
  neonAuthUsersSync,
  rules,
  scheduleEvents,
  skillModules,
  skillProgress,
  submissions,
  syncLog,
  teamMembers,
  teams,
  userProfiles,
} from './schema.js'

config({ path: '.env' })

type SeedUser = {
  id: string
  name: string
  email: string
  role: 'admin' | 'participant'
}

// Hardcoded UUIDs for seeded users.
// These must match users created in Neon Auth (via signUp or the dashboard).
const seedUsers: SeedUser[] = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Admin User', email: 'admin@ahp.rw', role: 'admin' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Ari K', email: 'ari@ahp.rw', role: 'participant' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Lena M', email: 'lena@ahp.rw', role: 'participant' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Sam P', email: 'sam@ahp.rw', role: 'participant' },
  { id: '00000000-0000-0000-0000-000000000005', name: 'Noah J', email: 'noah@ahp.rw', role: 'participant' },
  { id: '00000000-0000-0000-0000-000000000006', name: 'Mina R', email: 'mina@ahp.rw', role: 'participant' },
]

async function seedUserProfiles() {
  const db = getDb()

  // Look up actual users from neon_auth.users_sync by email.
  // If they exist, use their real IDs. Otherwise skip user-dependent seeding.
  const authUsers = await db.select({ id: neonAuthUsersSync.id, email: neonAuthUsersSync.email }).from(neonAuthUsersSync)
  const authByEmail = new Map(authUsers.map((u: { email: string | null; id: string }) => [u.email, u.id]))

  const resolved: Map<string, string> = new Map()

  for (const user of seedUsers) {
    const realId = authByEmail.get(user.email)
    if (!realId) {
      console.log(`[seed] Skipping user profile for ${user.email} — not found in neon_auth.users_sync`)
      continue
    }
    resolved.set(user.email, realId)

    await db
      .insert(userProfiles)
      .values({ userId: realId, displayName: user.name, role: user.role })
      .onConflictDoNothing()
  }

  return resolved
}

async function seedHackathon(): Promise<number> {
  const db = getDb()

  const [existing] = await db
    .select({ id: hackathons.id })
    .from(hackathons)
    .where(eq(hackathons.slug, 'aegis-2026'))

  if (existing) return existing.id

  const [row] = await db
    .insert(hackathons)
    .values({
      name: 'Aegis Hackathon 2026',
      slug: 'aegis-2026',
      description: 'Five days of engineering challenges. Build, optimize, and ship real solutions under time pressure. Solo or team — every submission counts toward the leaderboard.',
      startDate: new Date('2026-03-16T00:00:00Z'),
      endDate: new Date('2026-03-20T00:00:00Z'),
      isActive: true,
    })
    .returning({ id: hackathons.id })

  return row.id
}

async function seedChallenges(hackathonId: number) {
  const db = getDb()

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(challenges)
    .where(eq(challenges.hackathonId, hackathonId))

  if (Number(count) > 0) return

  const challengeData = [
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
      unlockAt: new Date('2026-03-16T09:00:00Z'),
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
      unlockAt: new Date('2026-03-17T09:00:00Z'),
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
      unlockAt: new Date('2026-03-18T09:00:00Z'),
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
      unlockAt: new Date('2026-03-19T09:00:00Z'),
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
      unlockAt: new Date('2026-03-20T09:00:00Z'),
    },
  ]

  await db.insert(challenges).values(challengeData)
}

async function seedScheduleEvents(hackathonId: number) {
  const db = getDb()

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(scheduleEvents)
    .where(eq(scheduleEvents.hackathonId, hackathonId))

  if (Number(count) > 0) return

  const events = [
    { hackathonId, dayNumber: 1, time: '08:30', title: 'Registration & Check-in', venue: 'Main Hall', sortOrder: 1 },
    { hackathonId, dayNumber: 1, time: '09:00', title: 'Opening Keynote', venue: 'Auditorium', sortOrder: 2 },
    { hackathonId, dayNumber: 1, time: '09:30', title: 'Challenge 1 Unlocks — Data Pipeline', venue: 'Challenge Board', sortOrder: 3 },
    { hackathonId, dayNumber: 1, time: '12:00', title: 'Lunch Break', venue: 'Courtyard', sortOrder: 4 },
    { hackathonId, dayNumber: 1, time: '13:00', title: 'Workshop: Effective Debugging', venue: 'Room A', sortOrder: 5 },
    { hackathonId, dayNumber: 1, time: '17:00', title: 'Day 1 Submissions Due', venue: 'Challenge Board', sortOrder: 6 },
    { hackathonId, dayNumber: 2, time: '09:00', title: 'Challenge 2 Unlocks — API Gateway', venue: 'Challenge Board', sortOrder: 1 },
    { hackathonId, dayNumber: 2, time: '10:30', title: 'Workshop: API Design Patterns', venue: 'Room B', sortOrder: 2 },
    { hackathonId, dayNumber: 2, time: '12:00', title: 'Lunch Break', venue: 'Courtyard', sortOrder: 3 },
    { hackathonId, dayNumber: 2, time: '14:00', title: 'Mentor Office Hours', venue: 'Room A', sortOrder: 4 },
    { hackathonId, dayNumber: 2, time: '17:00', title: 'Day 2 Submissions Due', venue: 'Challenge Board', sortOrder: 5 },
    { hackathonId, dayNumber: 3, time: '09:00', title: 'Challenge 3 Unlocks — Real-time Dashboard', venue: 'Challenge Board', sortOrder: 1 },
    { hackathonId, dayNumber: 3, time: '10:30', title: 'Workshop: Data Visualization', venue: 'Room B', sortOrder: 2 },
    { hackathonId, dayNumber: 3, time: '12:00', title: 'Lunch Break', venue: 'Courtyard', sortOrder: 3 },
    { hackathonId, dayNumber: 3, time: '15:00', title: 'Team Check-ins', venue: 'Main Hall', sortOrder: 4 },
    { hackathonId, dayNumber: 3, time: '17:00', title: 'Day 3 Submissions Due', venue: 'Challenge Board', sortOrder: 5 },
    { hackathonId, dayNumber: 4, time: '09:00', title: 'Challenge 4 Unlocks — Security Audit', venue: 'Challenge Board', sortOrder: 1 },
    { hackathonId, dayNumber: 4, time: '10:00', title: 'Workshop: Common Vulnerability Patterns', venue: 'Room A', sortOrder: 2 },
    { hackathonId, dayNumber: 4, time: '12:00', title: 'Lunch Break', venue: 'Courtyard', sortOrder: 3 },
    { hackathonId, dayNumber: 4, time: '14:00', title: 'Lightning Talks', venue: 'Auditorium', sortOrder: 4 },
    { hackathonId, dayNumber: 4, time: '17:00', title: 'Day 4 Submissions Due', venue: 'Challenge Board', sortOrder: 5 },
    { hackathonId, dayNumber: 5, time: '09:00', title: 'Challenge 5 Unlocks — System Design', venue: 'Challenge Board', sortOrder: 1 },
    { hackathonId, dayNumber: 5, time: '11:00', title: 'Workshop: Load Testing & Profiling', venue: 'Room B', sortOrder: 2 },
    { hackathonId, dayNumber: 5, time: '12:00', title: 'Lunch Break', venue: 'Courtyard', sortOrder: 3 },
    { hackathonId, dayNumber: 5, time: '15:00', title: 'Final Submissions Due', venue: 'Challenge Board', sortOrder: 4 },
    { hackathonId, dayNumber: 5, time: '16:00', title: 'Judging & Deliberation', venue: 'Main Hall', sortOrder: 5 },
    { hackathonId, dayNumber: 5, time: '17:30', title: 'Awards Ceremony & Closing', venue: 'Auditorium', sortOrder: 6 },
  ]

  await db.insert(scheduleEvents).values(events)
}

async function seedRules(hackathonId: number) {
  const db = getDb()

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rules)
    .where(eq(rules.hackathonId, hackathonId))

  if (Number(count) > 0) return

  const rulesList = [
    { hackathonId, title: 'One account per participant', body: 'Each participant must register with a unique email address. Sharing accounts is not permitted and will result in disqualification.', sortOrder: 1 },
    { hackathonId, title: 'Team size', body: 'Teams may have 1 to 4 members. You may participate solo. Team composition is locked after the first submission.', sortOrder: 2 },
    { hackathonId, title: 'Submission format', body: 'Submit through the platform before each daily deadline. Include a description of your approach, any trade-offs, and links to your code repository.', sortOrder: 3 },
    { hackathonId, title: 'Original work only', body: 'All code must be written during the hackathon. You may use open-source libraries and frameworks, but the core solution must be your own. AI assistants (Copilot, ChatGPT, etc.) are allowed as tools.', sortOrder: 4 },
    { hackathonId, title: 'Scoring criteria', body: 'Each challenge specifies its own scoring breakdown. Common factors: correctness, performance, code quality, and documentation. Partial credit is awarded.', sortOrder: 5 },
    { hackathonId, title: 'Daily deadlines', body: 'Challenges unlock at 09:00 and submissions close at 17:00 the same day. Late submissions are accepted with a 20% point penalty per hour.', sortOrder: 6 },
    { hackathonId, title: 'Code of conduct', body: 'Be respectful, inclusive, and constructive. Harassment, plagiarism, or deliberate sabotage of other teams will result in immediate disqualification.', sortOrder: 7 },
    { hackathonId, title: 'Disputes and judging', body: 'Judges\' decisions are final. If you believe there is a scoring error, submit a dispute through the platform within 1 hour of results being posted.', sortOrder: 8 },
  ]

  await db.insert(rules).values(rulesList)
}

async function seedSkillModules(hackathonId: number) {
  const db = getDb()

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(skillModules)
    .where(eq(skillModules.hackathonId, hackathonId))

  if (Number(count) > 0) return

  const modules = [
    { id: 'api-design', hackathonId, title: 'API Design', description: 'RESTful API design principles, versioning, error handling, and documentation with OpenAPI.', sortOrder: 1 },
    { id: 'data-modeling', hackathonId, title: 'Data Modeling', description: 'Relational and document database schema design, normalization, indexing strategies, and query optimization.', sortOrder: 2 },
    { id: 'testing', hackathonId, title: 'Testing Strategies', description: 'Unit testing, integration testing, load testing, and test-driven development workflows.', sortOrder: 3 },
    { id: 'security-fundamentals', hackathonId, title: 'Security Fundamentals', description: 'Authentication patterns, input validation, OWASP Top 10, and secure coding practices.', sortOrder: 4 },
    { id: 'system-design', hackathonId, title: 'System Design', description: 'Scalability patterns, caching strategies, load balancing, and distributed system trade-offs.', sortOrder: 5 },
  ]

  await db.insert(skillModules).values(modules)
}

async function seedTeams(hackathonId: number, usersByEmail: Map<string, string>) {
  const db = getDb()

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(teams)
    .where(eq(teams.hackathonId, hackathonId))

  if (Number(count) > 0) return

  const teamDefs = [
    { name: 'Nova Forge', leader: 'ari@ahp.rw', members: ['noah@ahp.rw'] },
    { name: 'Green Pulse', leader: 'lena@ahp.rw', members: ['mina@ahp.rw'] },
    { name: 'Signal 9', leader: 'sam@ahp.rw', members: [] as string[] },
  ]

  for (const def of teamDefs) {
    const leaderId = usersByEmail.get(def.leader)
    if (!leaderId) continue

    const [{ id: teamId }] = await db
      .insert(teams)
      .values({ hackathonId, name: def.name, createdBy: leaderId })
      .returning({ id: teams.id })

    await db.insert(teamMembers).values({ teamId, userId: leaderId, role: 'leader' })

    for (const memberEmail of def.members) {
      const memberId = usersByEmail.get(memberEmail)
      if (memberId) {
        await db.insert(teamMembers).values({ teamId, userId: memberId, role: 'member' })
      }
    }
  }
}

async function seedSubmissions(hackathonId: number, usersByEmail: Map<string, string>) {
  const db = getDb()

  const challengeRows = await db
    .select({ id: challenges.id, dayNumber: challenges.dayNumber })
    .from(challenges)
    .where(eq(challenges.hackathonId, hackathonId))
  const challengeByDay = new Map(challengeRows.map((c) => [c.dayNumber, c.id]))

  const teamRows = await db
    .select({ id: teams.id, name: teams.name })
    .from(teams)
    .where(eq(teams.hackathonId, hackathonId))
  const teamByName = new Map(teamRows.map((t) => [t.name, t.id]))

  const submissionTemplates = [
    {
      email: 'ari@ahp.rw', localId: 'seed-local-1', teamName: 'Nova Forge', day: 1,
      title: 'Stream-based CSV/JSON normalizer',
      description: 'Node.js streaming pipeline using Transform streams. Handles 15K records/sec with dedup via composite hash map. Skips malformed rows with structured error logging.',
      category: 'Algorithm', status: 'reviewed', score: 88, version: 2,
    },
    {
      email: 'lena@ahp.rw', localId: 'seed-local-2', teamName: 'Green Pulse', day: 2,
      title: 'Express gateway with sliding window limiter',
      description: 'Lightweight Express-based gateway with in-memory sliding window rate limiter and circuit breaker. Routes requests to three backends with <5ms overhead.',
      category: 'Optimization', status: 'reviewed', score: 92, version: 3,
    },
    {
      email: 'sam@ahp.rw', localId: 'seed-local-3', teamName: 'Signal 9', day: 1,
      title: 'Parallel CSV parser with worker threads',
      description: 'Multi-threaded CSV parser using Node.js worker_threads. Splits input into chunks and processes in parallel. Achieves 22K records/sec on test data.',
      category: 'Algorithm', status: 'reviewed', score: 78, version: 1,
    },
    {
      email: 'ari@ahp.rw', localId: 'seed-local-4', teamName: 'Nova Forge', day: 2,
      title: 'Go reverse proxy with circuit breaker',
      description: 'Go-based reverse proxy using goroutines for concurrent request handling. Implements token bucket rate limiting and exponential backoff circuit breaker.',
      category: 'Systems', status: 'reviewed', score: 85, version: 1,
    },
    {
      email: 'lena@ahp.rw', localId: 'seed-local-5', teamName: 'Green Pulse', day: 1,
      title: 'Python pandas pipeline with validation',
      description: 'Pandas-based pipeline with schema validation using pydantic. Processes 12K records/sec with detailed error reports and duplicate detection.',
      category: 'Algorithm', status: 'reviewed', score: 72, version: 1,
    },
    {
      email: 'noah@ahp.rw', localId: 'seed-local-6', teamName: 'Nova Forge', day: 3,
      title: 'Canvas-based real-time sensor dashboard',
      description: 'Pure Canvas dashboard with requestAnimationFrame loop. Renders line charts, bar charts, and alert log at 60fps. Uses ring buffer for time-series data.',
      category: 'Visualization', status: 'submitted', score: null, version: 1,
    },
    {
      email: 'mina@ahp.rw', localId: 'seed-local-7', teamName: 'Green Pulse', day: 3,
      title: 'D3.js dashboard with WebSocket reconnect',
      description: 'D3.js-powered dashboard with automatic WebSocket reconnection and data replay. SVG charts with smooth transitions and threshold-based alerting.',
      category: 'Visualization', status: 'submitted', score: null, version: 1,
    },
  ]

  for (const item of submissionTemplates) {
    const userId = usersByEmail.get(item.email)
    if (!userId) continue

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(submissions)
      .where(eq(submissions.localId, item.localId))

    if (Number(count) > 0) continue

    await db.insert(submissions).values({
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
    })
  }
}

async function seedSkillProgress(usersByEmail: Map<string, string>) {
  const db = getDb()
  const modules = ['api-design', 'data-modeling', 'testing', 'security-fundamentals', 'system-design']

  const progressMap: Record<string, Record<string, 'completed' | 'in_progress'>> = {
    'ari@ahp.rw': { 'api-design': 'completed', 'data-modeling': 'completed', 'testing': 'in_progress', 'security-fundamentals': 'in_progress', 'system-design': 'in_progress' },
    'lena@ahp.rw': { 'api-design': 'completed', 'data-modeling': 'in_progress', 'testing': 'completed', 'security-fundamentals': 'in_progress', 'system-design': 'in_progress' },
    'sam@ahp.rw': { 'api-design': 'completed', 'data-modeling': 'completed', 'testing': 'completed', 'security-fundamentals': 'in_progress', 'system-design': 'in_progress' },
    'noah@ahp.rw': { 'api-design': 'in_progress', 'data-modeling': 'in_progress', 'testing': 'in_progress', 'security-fundamentals': 'in_progress', 'system-design': 'in_progress' },
    'mina@ahp.rw': { 'api-design': 'completed', 'data-modeling': 'completed', 'testing': 'in_progress', 'security-fundamentals': 'completed', 'system-design': 'in_progress' },
  }

  for (const [email, userProgress] of Object.entries(progressMap)) {
    const userId = usersByEmail.get(email)
    if (!userId) continue

    for (const moduleId of modules) {
      const status = userProgress[moduleId] ?? 'in_progress'
      const completedAt = status === 'completed' ? new Date() : null
      const version = status === 'completed' ? 2 : 1

      await db
        .insert(skillProgress)
        .values({ userId, moduleId, status, completedAt, version })
        .onConflictDoNothing()
    }
  }
}

async function seedSyncLog(usersByEmail: Map<string, string>) {
  const db = getDb()

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(syncLog)

  if (Number(count) > 0) return

  const entries = [
    { email: 'ari@ahp.rw', entityId: 'seed-local-1' },
    { email: 'lena@ahp.rw', entityId: 'seed-local-2' },
    { email: 'sam@ahp.rw', entityId: 'seed-local-3' },
    { email: 'ari@ahp.rw', entityId: 'seed-local-4' },
    { email: 'lena@ahp.rw', entityId: 'seed-local-5' },
    { email: 'noah@ahp.rw', entityId: 'seed-local-6' },
    { email: 'mina@ahp.rw', entityId: 'seed-local-7' },
  ]

  for (const entry of entries) {
    const userId = usersByEmail.get(entry.email) ?? null
    await db.insert(syncLog).values({
      userId,
      action: 'submission',
      entityType: 'submission',
      entityId: entry.entityId,
      status: 'success',
    })
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production') {
    console.error('[seed] Refusing to seed in production')
    process.exit(1)
  }

  console.log('[seed] Starting...')

  const usersByEmail = await seedUserProfiles()
  console.log(`[seed] User profiles: ${usersByEmail.size} resolved`)

  const hackathonId = await seedHackathon()
  console.log(`[seed] Hackathon id: ${hackathonId}`)

  await seedChallenges(hackathonId)
  console.log('[seed] Challenges seeded')

  await seedScheduleEvents(hackathonId)
  console.log('[seed] Schedule events seeded')

  await seedRules(hackathonId)
  console.log('[seed] Rules seeded')

  await seedSkillModules(hackathonId)
  console.log('[seed] Skill modules seeded')

  if (usersByEmail.size > 0) {
    await seedTeams(hackathonId, usersByEmail)
    console.log('[seed] Teams seeded')

    await seedSubmissions(hackathonId, usersByEmail)
    console.log('[seed] Submissions seeded')

    await seedSkillProgress(usersByEmail)
    console.log('[seed] Skill progress seeded')

    await seedSyncLog(usersByEmail)
    console.log('[seed] Sync log seeded')
  } else {
    console.log('[seed] No auth users found — skipping user-dependent data (teams, submissions, etc.)')
    console.log('[seed] Create users via the signup flow, then re-run this script')
  }

  console.log('[seed] Done')
  process.exit(0)
}

main().catch((err) => {
  console.error('[seed] Fatal error:', err)
  process.exit(1)
})
