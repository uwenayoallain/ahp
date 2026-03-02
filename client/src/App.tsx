import type { ReactElement } from 'react'
import { Navigate, Outlet, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppShell } from './components/layout/AppShell'
import { AuthProvider } from './context/AuthContext'
import { NetworkProvider } from './context/NetworkContext'
import { useAuth } from './hooks/useAuth'
import { ChallengeDetailPage } from './pages/ChallengeDetail'
import { HomePage } from './pages/Home'
import { LandingPage } from './pages/Landing'
import { LeaderboardPage } from './pages/Leaderboard'
import { LoginPage } from './pages/Login'
import { MySubmissionsPage } from './pages/MySubmissions'
import { NotFoundPage } from './pages/NotFound'
import { RulesPage } from './pages/Rules'
import { SchedulePage } from './pages/Schedule'
import { SkillModulesPage } from './pages/SkillModules'
import { SubmissionDetailPage } from './pages/SubmissionDetail'
import { SubmitProjectPage } from './pages/SubmitProject'
import { TeamsPage } from './pages/Teams'
import { AdminDashboardPage } from './pages/admin/Dashboard'
import { AdminProgressPage } from './pages/admin/Progress'
import { AdminSubmissionDetailPage } from './pages/admin/SubmissionDetail'
import { AdminSubmissionsPage } from './pages/admin/Submissions'

function RequireAuth({ children }: { children: ReactElement }) {
  const { isAuthenticated, isAuthLoading } = useAuth()

  if (isAuthLoading) {
    return <div className="public-shell"><p className="status-text">Loading...</p></div>
  }

  if (isAuthenticated === false) {
    return <Navigate to="/login" replace />
  }

  return children
}

function RequireAdmin({ children }: { children: ReactElement }) {
  const { userRole } = useAuth()

  if (userRole !== 'admin') {
    return <Navigate to="/app" replace />
  }

  return children
}

function PublicLayout() {
  return (
    <div className="public-shell">
      <Outlet />
    </div>
  )
}

function PublicPage() {
  return (
    <div className="public-page-wrap">
      <Outlet />
    </div>
  )
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: 'login', element: <LoginPage /> },
    ],
  },
  {
    path: '/leaderboard',
    element: <PublicPage />,
    children: [
      { index: true, element: <LeaderboardPage /> },
    ],
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <HomePage /> },
      { path: 'challenges', element: <SchedulePage /> },
      { path: 'challenges/:slug', element: <ChallengeDetailPage /> },
      { path: 'leaderboard', element: <LeaderboardPage /> },
      { path: 'teams', element: <TeamsPage /> },
      { path: 'rules', element: <RulesPage /> },
      { path: 'tracks', element: <SkillModulesPage /> },
      { path: 'submit', element: <SubmitProjectPage /> },
      { path: 'submissions', element: <MySubmissionsPage /> },
      { path: 'submissions/:id', element: <SubmissionDetailPage /> },
      {
        path: 'admin',
        element: (
          <RequireAdmin>
            <Outlet />
          </RequireAdmin>
        ),
        children: [
          { path: 'dashboard', element: <AdminDashboardPage /> },
          { path: 'submissions', element: <AdminSubmissionsPage /> },
          { path: 'submissions/:id', element: <AdminSubmissionDetailPage /> },
          { path: 'progress', element: <AdminProgressPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <NetworkProvider>
          <RouterProvider router={router} />
        </NetworkProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
