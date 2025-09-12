import { 
  LayoutDashboard, 
  FileText, 
  BriefcaseIcon, 
  BarChart3, 
  Sparkles, 
  Settings, 
  ShieldCheck 
} from "lucide-react"
import { NavLink, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"

// Mock user role - in Phase 2 this will come from Supabase auth
const mockUser = { role: "admin" } // Change to "user" to test non-admin view

const navigationItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "My Resumes", url: "/resumes", icon: FileText },
  { title: "Job Descriptions", url: "/jobs", icon: BriefcaseIcon },
  { title: "ATS Analyses", url: "/analyses", icon: BarChart3 },
  { title: "Enriched Experiences", url: "/experiences", icon: Sparkles },
  { title: "Settings", url: "/settings", icon: Settings },
]

const adminItems = [
  { title: "Admin Dashboard", url: "/admin", icon: ShieldCheck },
]

export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname

  const isActive = (path: string) => {
    if (path === "/") {
      return currentPath === "/"
    }
    return currentPath.startsWith(path)
  }

  const getNavClass = (path: string) => {
    const baseClass = "transition-colors duration-200 group-hover:bg-sidebar-accent/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    return isActive(path) 
      ? `${baseClass} bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground font-medium`
      : `${baseClass} text-sidebar-foreground`
  }

  const isCollapsed = state === "collapsed"

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border pb-4">
        <div className="flex items-center gap-2 px-4 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <BarChart3 className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">Smart ATS</span>
              <span className="text-xs text-sidebar-foreground/70">Recruitment Platform</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/70">
            {!isCollapsed && "Main Navigation"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="group">
                    <NavLink to={item.url} className={getNavClass(item.url)}>
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span className="truncate">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {mockUser.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">
              {!isCollapsed && "Administration"}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="group">
                      <NavLink to={item.url} className={getNavClass(item.url)}>
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!isCollapsed && <span className="truncate">{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}