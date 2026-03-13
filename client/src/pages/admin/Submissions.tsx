import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/ui/PageHeader'
import { StatCard } from '../../components/ui/StatCard'
import { formatDateTime } from '../../lib/format'
import { fetchAdminSubmissions } from './adminApi'
import type { AdminSubmissionRecord, SubmissionStatus } from './submissionsData'

const PAGE_SIZE = 10

type SortKey = 'submittedAt' | 'score' | 'team'

type Filters = {
  query: string
  status: 'All' | SubmissionStatus
  category: string
  sortKey: SortKey
}

const initialFilters: Filters = {
  query: '',
  status: 'All',
  category: 'All',
  sortKey: 'submittedAt',
}

function statusClassName(status: SubmissionStatus) {
  if (status === 'Reviewed') return 'badge badge--success'
  if (status === 'Needs Fix') return 'badge badge--warning'
  return 'badge'
}

function sortRows(rows: AdminSubmissionRecord[], sortKey: SortKey) {
  if (sortKey === 'score') {
    return [...rows].sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
  }

  if (sortKey === 'team') {
    return [...rows].sort((a, b) => a.team.localeCompare(b.team))
  }

  return [...rows].sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
  )
}

function filterRows(rows: AdminSubmissionRecord[], filters: Filters) {
  const query = filters.query.trim().toLowerCase()

  return rows.filter((row) => {
    const matchesQuery =
      query.length === 0 ||
      row.team.toLowerCase().includes(query) ||
      row.projectTitle.toLowerCase().includes(query) ||
      row.userName.toLowerCase().includes(query)

    const matchesStatus = filters.status === 'All' || row.status === filters.status
    const matchesCategory = filters.category === 'All' || row.category === filters.category

    return matchesQuery && matchesStatus && matchesCategory
  })
}

export function AdminSubmissionsPage() {
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<AdminSubmissionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const items = await fetchAdminSubmissions()
        if (!cancelled) setRows(items)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load submissions')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => { cancelled = true }
  }, [])

  const filteredRows = useMemo(() => filterRows(rows, filters), [rows, filters])
  const sortedRows = useMemo(() => sortRows(filteredRows, filters.sortKey), [filteredRows, filters.sortKey])
  const categories = useMemo(() => [...new Set(rows.map((r) => r.category))].sort(), [rows])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE
    return sortedRows.slice(start, start + PAGE_SIZE)
  }, [currentPage, sortedRows])

  const reviewedCount = filteredRows.filter((row) => row.status === 'Reviewed').length
  const needsFixCount = filteredRows.filter((row) => row.status === 'Needs Fix').length

  return (
    <>
      <PageHeader
        title="Submissions"
        subtitle="Search, filter, and review challenge submissions from all participants."
      />

      {error && <p className="status-text status-text--error">{error}</p>}

      <section className="grid-cards">
        <StatCard
          label="Total"
          value={filteredRows.length}
          description="Submissions in the current view."
          badge={<p className="badge">Total</p>}
        />
        <StatCard
          label="Reviewed"
          value={reviewedCount}
          description="Scored and reviewed."
          badge={<p className="badge badge--success">Reviewed</p>}
        />
        <StatCard
          label="Needs fix"
          value={needsFixCount}
          description="Returned for revision."
          badge={<p className="badge badge--warning">Needs fix</p>}
        />
      </section>

      <section className="panel-surface table-panel">
        <div className="table-toolbar">
          <label className="field-inline">
            Search
            <input
              type="search"
              value={filters.query}
              placeholder="Team, name, or challenge"
              onChange={(event) => {
                const query = event.target.value
                setPage(1)
                setFilters((prev) => ({ ...prev, query }))
              }}
            />
          </label>

          <label className="field-inline">
            Status
            <select
              value={filters.status}
              onChange={(event) => {
                const status = event.target.value as Filters['status']
                setPage(1)
                setFilters((prev) => ({ ...prev, status }))
              }}
            >
              <option value="All">All</option>
              <option value="Submitted">Submitted</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Needs Fix">Needs Fix</option>
            </select>
          </label>

          <label className="field-inline">
            Category
            <select
              value={filters.category}
              onChange={(event) => {
                const category = event.target.value
                setPage(1)
                setFilters((prev) => ({ ...prev, category }))
              }}
            >
              <option value="All">All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </label>

          <label className="field-inline">
            Sort
            <select
              value={filters.sortKey}
              onChange={(event) => {
                const sortKey = event.target.value as Filters['sortKey']
                setFilters((prev) => ({ ...prev, sortKey }))
              }}
            >
              <option value="submittedAt">Newest</option>
              <option value="score">Highest score</option>
              <option value="team">Team</option>
            </select>
          </label>
        </div>

        {loading && <p className="status-text">Loading...</p>}

        {!loading && (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Participant</th>
                  <th>Challenge</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="link-strong" to={`/app/admin/submissions/${row.id}`}>
                        {row.team || '--'}
                      </Link>
                    </td>
                    <td>{row.userName}</td>
                    <td>{row.challengeTitle ? `Day ${row.dayNumber}: ${row.challengeTitle}` : row.projectTitle}</td>
                    <td>{row.category}</td>
                    <td>
                      <span className={statusClassName(row.status)}>{row.status}</span>
                    </td>
                    <td>{row.score !== null ? row.score : '--'}</td>
                    <td>{formatDateTime(row.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="table-footer">
          <p>
            Page {currentPage} of {totalPages}
          </p>
          <div className="actions">
            <button
              type="button"
              className="btn secondary"
              disabled={currentPage === 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn secondary"
              disabled={currentPage === totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
