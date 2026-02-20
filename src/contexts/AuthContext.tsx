import { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import { authEvents } from '@/lib/authLogger'

interface SATSUser {
  id: string
  auth_user_id: string
  name: string
  role: 'user' | 'admin'
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  session: Session | null
  satsUser: SATSUser | null
  loading: boolean
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any; data?: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<{ error: any }>
  resetPassword: (email: string) => Promise<{ error: any }>
  resendConfirmation: (email: string) => Promise<{ error: any }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [satsUser, setSatsUser] = useState<SATSUser | null>(null)
  const [loading, setLoading] = useState(true)

  // Check and reactivate soft-deleted user
  const checkAndReactivateUser = async (userId: string) => {
    try {
      // Check if user is soft-deleted
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('deleted_at')
        .eq('user_id', userId)
        .maybeSingle()

      if (profile?.deleted_at) {
        console.log('User is soft-deleted, attempting reactivation...')
        const { data, error: reactivateError } = await supabase.rpc(
          'reactivate_soft_deleted_user',
          { target_user_id: userId }
        )

        if (reactivateError) {
          console.error('Error reactivating user:', reactivateError)
          await authEvents.userReactivation(userId, false, reactivateError)
          return false
        }

        console.log('User reactivated successfully:', data)
        await authEvents.userReactivation(userId, true)
        return true
      }

      return false // User was not soft-deleted
    } catch (error) {
      console.error('Error checking user reactivation status:', error)
      await authEvents.userReactivation(userId, false, error)
      return false
    }
  }

  const fetchSATSUser = async (userId: string) => {
    try {
      // First check and reactivate if needed
      await checkAndReactivateUser(userId)

      const { data, error } = await supabase
        .from('sats_users_public')
        .select('*')
        .eq('auth_user_id', userId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setSatsUser(data as SATSUser)
        await authEvents.satsUserFetch(userId, true)
      } else {
        // SATS user record should be created automatically by database triggers
        // If it doesn't exist, this indicates a trigger failure or timing issue
        console.error(
          'SATS user record not found for user:',
          userId,
          '- database triggers may have failed'
        )
        await authEvents.satsUserFetch(
          userId,
          false,
          false,
          new Error('SATS user record not found - database triggers may have failed')
        )

        // Wait a moment and retry once in case of timing issues
        setTimeout(async () => {
          console.log('Retrying SATS user fetch after delay...')
          try {
            const { data: retryData, error: retryError } = await supabase
              .from('sats_users_public')
              .select('*')
              .eq('auth_user_id', userId)
              .maybeSingle()

            if (!retryError && retryData) {
              setSatsUser(retryData as SATSUser)
              console.log('Successfully fetched SATS user on retry')
              await authEvents.satsUserFetch(userId, true, true)
            } else {
              console.error('SATS user still not found after retry - this requires investigation')
              setSatsUser(null)
              await authEvents.satsUserFetch(
                userId,
                false,
                true,
                retryError || new Error('SATS user still not found after retry')
              )
            }
          } catch (retryError) {
            console.error('Error retrying SATS user fetch:', retryError)
            setSatsUser(null)
            await authEvents.satsUserFetch(userId, false, true, retryError)
          }
        }, 2000)

        setSatsUser(null)
      }
    } catch (error) {
      console.error('Error fetching SATS user:', error)
      setSatsUser(null)
      await authEvents.satsUserFetch(userId, false, false, error)
    }
  }

  useEffect(() => {
    console.log('AuthProvider: Initializing authentication...')

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('AuthProvider: Auth state changed', {
        event,
        session: !!session,
        userId: session?.user?.id,
      })

      // Log session state changes
      setTimeout(() => {
        authEvents.sessionStateChange(event, session?.user?.id, {
          has_session: !!session,
          session_expires_at: session?.expires_at,
        })
      }, 0)

      setSession(session)
      setUser(session?.user ?? null)

      // Handle different authentication events
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('AuthProvider: User signed in successfully')
        setTimeout(() => {
          fetchSATSUser(session.user.id)
        }, 0)
      } else if (event === 'SIGNED_OUT') {
        console.log('AuthProvider: User signed out')
        setSatsUser(null)
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('AuthProvider: Token refreshed')
        setTimeout(() => {
          authEvents.tokenRefresh(session.user.id, true)
        }, 0)
        // Don't refetch SATS user on token refresh if we already have it
        if (!satsUser) {
          setTimeout(() => {
            fetchSATSUser(session.user.id)
          }, 0)
        }
      } else if (session?.user) {
        // For any other event with a valid session, fetch SATS user if we don't have it
        if (!satsUser) {
          setTimeout(() => {
            fetchSATSUser(session.user.id)
          }, 0)
        }
      } else {
        setSatsUser(null)
      }

      setLoading(false)
    })

    // Handle URL fragments for email verification redirects
    const handleAuthFromUrl = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error('AuthProvider: Error getting session from URL:', error)
        await authEvents.sessionRecovery(undefined, false, error)
      } else if (data.session) {
        console.log('AuthProvider: Session recovered from URL')
        await authEvents.sessionRecovery(data.session.user.id, true)
        setSession(data.session)
        setUser(data.session.user)
        setTimeout(() => {
          fetchSATSUser(data.session.user.id)
        }, 0)
      } else {
        await authEvents.sessionRecovery(undefined, false, new Error('No session found in URL'))
      }
      setLoading(false)
    }

    // Check for existing session and handle URL fragments
    handleAuthFromUrl()

    return () => subscription.unsubscribe()
  }, [])

  const signUp = async (email: string, password: string, name?: string) => {
    await authEvents.signUpAttempt(email, { name, redirect_url: window.location.origin })

    const redirectUrl = `${window.location.origin}/`

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: name ? { name } : undefined,
      },
    })

    if (error) {
      await authEvents.signUpError(email, error)
    } else if (data.user) {
      const isReactivation = data.user.email_confirmed_at !== null
      await authEvents.signUpSuccess(data.user.id, email, isReactivation)
    }

    return { error, data }
  }

  const signIn = async (email: string, password: string) => {
    await authEvents.signInAttempt(email)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      await authEvents.signInError(email, error)
    } else if (data.user) {
      await authEvents.signInSuccess(data.user.id, email)
    }

    return { error }
  }

  const signOut = async () => {
    try {
      const currentUserId = user?.id
      await authEvents.signOutAttempt(currentUserId)

      console.log('AuthProvider: Starting sign-out process...')

      // Clear local state immediately to prevent UI confusion
      setLoading(true)

      // Attempt sign-out with Supabase
      const { error } = await supabase.auth.signOut()

      if (error) {
        console.error('AuthProvider: Sign-out error:', error)
        await authEvents.signOutError(currentUserId, error)
        // Even if sign-out fails on server, clear local state for security
        setSession(null)
        setUser(null)
        setSatsUser(null)
        setLoading(false)
        return { error }
      }

      console.log('AuthProvider: Sign-out successful')
      await authEvents.signOutSuccess(currentUserId)
      // State will be cleared by the onAuthStateChange listener
      return { error: null }
    } catch (error) {
      console.error('AuthProvider: Sign-out failed:', error)
      await authEvents.signOutError(user?.id, error)
      // Force clear local state even on error for security
      setSession(null)
      setUser(null)
      setSatsUser(null)
      setLoading(false)
      return { error }
    }
  }

  const resetPassword = async (email: string) => {
    await authEvents.passwordResetAttempt(email)

    const redirectUrl = `${window.location.origin}/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    })

    if (error) {
      await authEvents.passwordResetError(email, error)
    } else {
      await authEvents.passwordResetSuccess(email)
    }

    return { error }
  }

  const resendConfirmation = async (email: string) => {
    await authEvents.resendConfirmationAttempt(email)

    const redirectUrl = `${window.location.origin}/`

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectUrl,
      },
    })

    if (error) {
      await authEvents.resendConfirmationError(email, error)
    } else {
      await authEvents.resendConfirmationSuccess(email)
    }

    return { error }
  }

  const value = {
    user,
    session,
    satsUser,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendConfirmation,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
