import {
  LayoutDashboard,
  FileText,
  BriefcaseIcon,
  BarChart3,
  Sparkles,
  GraduationCap,
  HelpCircle,
  Radar,
  Settings,
  ShieldCheck,
  LogOut,
  User,
} from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { toast } from '@/hooks/use-toast'
import { useUserRole } from '@/hooks/useUserRole'

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
} from '@/components/ui/sidebar'

// Navigation items remain the same
const navigationItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'My Resumes', url: '/resumes', icon: FileText },
  { title: 'Job Descriptions', url: '/jobs', icon: BriefcaseIcon },
  { title: 'ATS Analyses', url: '/analyses', icon: BarChart3 },
  { title: 'Opportunities', url: '/opportunities', icon: Radar },
  { title: 'Enriched Experiences', url: '/experiences', icon: Sparkles },
  { title: 'Roadmaps', url: '/roadmaps', icon: GraduationCap },
  { title: 'Help Hub', url: '/help', icon: HelpCircle },
  { title: 'Settings', url: '/settings', icon: Settings },
]

const adminItems = [{ title: 'Admin Dashboard', url: '/admin', icon: ShieldCheck }]

export function AppSidebar() {
  const { state } = useSidebar()
  const { satsUser, signOut } = useAuth()
  const { isAdmin } = useUserRole()
  const location = useLocation()
  const currentPath = location.pathname

  const handleSignOut = async () => {
    try {
      const { error } = await signOut()
      if (error) {
        console.error('Sign-out failed:', error)
        toast({
          title: 'Sign-out failed',
          description: 'There was an issue signing you out. Please try again.',
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Signed out successfully',
          description: 'You have been signed out of your account.',
        })
      }
    } catch (error) {
      console.error('Unexpected sign-out error:', error)
      toast({
        title: 'Sign-out failed',
        description: 'An unexpected error occurred. Please refresh the page and try again.',
        variant: 'destructive',
      })
    }
  }

  const isActive = (path: string) => {
    if (path === '/') {
      return currentPath === '/'
    }
    return currentPath.startsWith(path)
  }

  const getNavClass = (path: string) => {
    const baseClass =
      'transition-colors duration-200 group-hover:bg-sidebar-accent/50 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
    return isActive(path)
      ? `${baseClass} bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground font-medium`
      : `${baseClass} text-sidebar-foreground`
  }

  const isCollapsed = state === 'collapsed'

  return (
    <Sidebar className={isCollapsed ? 'w-16' : 'w-64'} collapsible="icon">
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
            {!isCollapsed && 'Main Navigation'}
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

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/70">
              {!isCollapsed && 'Administration'}
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

        {/* User Profile and Logout */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {satsUser && (
                <SidebarMenuItem>
                  <div className="flex items-center px-2 py-1.5 text-sm text-sidebar-foreground">
                    <User className="h-4 w-4 flex-shrink-0 mr-2" />
                    {!isCollapsed && (
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="font-medium truncate">{satsUser.name}</span>
                        <span className="text-xs text-sidebar-foreground/70 capitalize">
                          {satsUser.role}
                        </span>
                      </div>
                    )}
                  </div>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleSignOut}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 group"
                >
                  <LogOut className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>Sign Out</span>}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
