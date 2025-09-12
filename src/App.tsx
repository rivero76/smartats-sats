import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppSidebar } from "./components/AppSidebar";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import MyResumes from "./pages/MyResumes";
import JobDescriptions from "./pages/JobDescriptions";
import ATSAnalyses from "./pages/ATSAnalyses";
import EnrichedExperiences from "./pages/EnrichedExperiences";
import Settings from "./pages/Settings";
import AdminDashboard from "./pages/AdminDashboard";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={
              <ProtectedRoute>
                <SidebarProvider>
                  <div className="min-h-screen flex w-full">
                    <AppSidebar />
                    <div className="flex-1 flex flex-col">
                      <header className="h-14 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
                        <SidebarTrigger />
                        <div className="flex-1" />
                      </header>
                      <main className="flex-1 p-6 bg-muted/30">
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/resumes" element={<MyResumes />} />
                          <Route path="/jobs" element={<JobDescriptions />} />
                          <Route path="/analyses" element={<ATSAnalyses />} />
                          <Route path="/experiences" element={<EnrichedExperiences />} />
                          <Route path="/settings" element={<Settings />} />
                          <Route path="/admin" element={<AdminDashboard />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </SidebarProvider>
              </ProtectedRoute>
            } />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
