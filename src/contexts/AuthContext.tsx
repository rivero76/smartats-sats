import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface SATSUser {
  id: string;
  auth_user_id: string;
  name: string;
  role: "user" | "admin";
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  satsUser: SATSUser | null;
  loading: boolean;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any; data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<{ error: any }>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resendConfirmation: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [satsUser, setSatsUser] = useState<SATSUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSATSUser = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("sats_users_public")
        .select("*")
        .eq("auth_user_id", userId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setSatsUser(data as SATSUser);
      } else {
        // SATS user record should be created automatically by database triggers
        // If it doesn't exist, this indicates a trigger failure or timing issue
        console.error("SATS user record not found for user:", userId, "- database triggers may have failed");
        
        // Wait a moment and retry once in case of timing issues
        setTimeout(async () => {
          console.log("Retrying SATS user fetch after delay...");
          try {
            const { data: retryData, error: retryError } = await supabase
              .from("sats_users_public")
              .select("*")
              .eq("auth_user_id", userId)
              .maybeSingle();
            
            if (!retryError && retryData) {
              setSatsUser(retryData as SATSUser);
              console.log("Successfully fetched SATS user on retry");
            } else {
              console.error("SATS user still not found after retry - this requires investigation");
              setSatsUser(null);
            }
          } catch (retryError) {
            console.error("Error retrying SATS user fetch:", retryError);
            setSatsUser(null);
          }
        }, 2000);
        
        setSatsUser(null);
      }
    } catch (error) {
      console.error("Error fetching SATS user:", error);
      setSatsUser(null);
    }
  };

  useEffect(() => {
    console.log("AuthProvider: Initializing authentication...");
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("AuthProvider: Auth state changed", { event, session: !!session, userId: session?.user?.id });
        
        setSession(session);
        setUser(session?.user ?? null);
        
        // Handle different authentication events
        if (event === 'SIGNED_IN' && session?.user) {
          console.log("AuthProvider: User signed in successfully");
          setTimeout(() => {
            fetchSATSUser(session.user.id);
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          console.log("AuthProvider: User signed out");
          setSatsUser(null);
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log("AuthProvider: Token refreshed");
          // Don't refetch SATS user on token refresh if we already have it
          if (!satsUser) {
            setTimeout(() => {
              fetchSATSUser(session.user.id);
            }, 0);
          }
        } else if (session?.user) {
          // For any other event with a valid session, fetch SATS user if we don't have it
          if (!satsUser) {
            setTimeout(() => {
              fetchSATSUser(session.user.id);
            }, 0);
          }
        } else {
          setSatsUser(null);
        }
        
        setLoading(false);
      }
    );

    // Handle URL fragments for email verification redirects
    const handleAuthFromUrl = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("AuthProvider: Error getting session from URL:", error);
      } else if (data.session) {
        console.log("AuthProvider: Session recovered from URL");
        setSession(data.session);
        setUser(data.session.user);
        setTimeout(() => {
          fetchSATSUser(data.session.user.id);
        }, 0);
      }
      setLoading(false);
    };

    // Check for existing session and handle URL fragments
    handleAuthFromUrl();

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: name ? { name } : undefined,
      }
    });
    
    return { error, data };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    try {
      console.log("AuthProvider: Starting sign-out process...");
      
      // Clear local state immediately to prevent UI confusion
      setLoading(true);
      
      // Attempt sign-out with Supabase
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("AuthProvider: Sign-out error:", error);
        // Even if sign-out fails on server, clear local state for security
        setSession(null);
        setUser(null);
        setSatsUser(null);
        setLoading(false);
        return { error };
      }
      
      console.log("AuthProvider: Sign-out successful");
      // State will be cleared by the onAuthStateChange listener
      return { error: null };
      
    } catch (error) {
      console.error("AuthProvider: Sign-out failed:", error);
      // Force clear local state even on error for security
      setSession(null);
      setUser(null);  
      setSatsUser(null);
      setLoading(false);
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    
    return { error };
  };

  const resendConfirmation = async (email: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: redirectUrl,
      }
    });
    
    return { error };
  };

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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};