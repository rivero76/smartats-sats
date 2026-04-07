/**
 * UPDATE LOG
 * 2026-03-17 12:00:00 | P1-2: wrap main route outlet in ErrorBoundary to prevent blank-screen crashes
 * 2026-03-26 19:00:00 | P19 S2-2: add AnimatePresence page transitions via AnimatedRoutes component (P19-S2-2)
 * 2026-04-02 00:00:00 | Add /pm route for PM Dashboard (unified backlog/roadmap/incident view)
 * 2026-04-05 22:30:00 | P26 S6-1 — Add /gap route for Gap Analysis page.
 * 2026-04-07 00:00:00 | P28 S4 — Add /profile-fit route for Profile Fit Analyzer.
 */
import React from 'react'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { fadeIn } from '@/lib/animations'
import { AppSidebar } from './components/AppSidebar'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import Dashboard from './pages/Dashboard'
import MyResumes from './pages/MyResumes'
import JobDescriptions from './pages/JobDescriptions'
import ATSAnalyses from './pages/ATSAnalyses'
import ProactiveMatches from './pages/ProactiveMatches'
import EnrichedExperiences from './pages/EnrichedExperiences'
import UpskillingRoadmaps from './pages/UpskillingRoadmaps'
import Settings from './pages/Settings'
import HelpHub from './pages/HelpHub'
import AdminDashboard from './pages/AdminDashboard'
import Auth from './pages/Auth'
import ResetPassword from './pages/ResetPassword'
import NotFound from './pages/NotFound'
import PMDashboard from './pages/PMDashboard'
import GapMatrix from './pages/GapMatrix'
import ProfileFit from './pages/ProfileFit'

// Added imports
import DevErrorOverlay from '@/components/DevErrorOverlay'
import { DevLogger } from '@/lib/devLogger'
import { ErrorBoundary } from '@/components/ErrorBoundary'

const SHOULD_SHOW_DEV_OVERLAY =
  import.meta.env.DEV && import.meta.env.VITE_LOGGING_ENABLED !== 'false'

const queryClient = new QueryClient()

// AnimatedRoutes must live inside BrowserRouter to access useLocation
const AnimatedRoutes = () => {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="flex-1"
      >
        <ErrorBoundary>
          <Routes location={location}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/resumes" element={<MyResumes />} />
            <Route path="/jobs" element={<JobDescriptions />} />
            <Route path="/analyses" element={<ATSAnalyses />} />
            <Route path="/opportunities" element={<ProactiveMatches />} />
            <Route path="/experiences" element={<EnrichedExperiences />} />
            <Route path="/roadmaps" element={<UpskillingRoadmaps />} />
            <Route path="/gap" element={<GapMatrix />} />
            <Route path="/profile-fit" element={<ProfileFit />} />
            <Route path="/help" element={<HelpHub />} />
            <Route path="/pm" element={<PMDashboard />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </ErrorBoundary>
      </motion.div>
    </AnimatePresence>
  )
}

const App = () => {
  DevLogger.info('App started successfully.')

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <SidebarProvider>
                      <div className="min-h-screen flex w-full">
                        <AppSidebar />
                        <div className="flex-1 flex flex-col">
                          <header className="h-14 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
                            <SidebarTrigger />
                            <div className="flex-1" />
                          </header>
                          <main className="flex-1 p-6 bg-muted/30 flex flex-col">
                            <AnimatedRoutes />
                          </main>
                        </div>
                      </div>
                    </SidebarProvider>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>

          {/* Only active in dev mode */}
          {SHOULD_SHOW_DEV_OVERLAY && <DevErrorOverlay />}
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
