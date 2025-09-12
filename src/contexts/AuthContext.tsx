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
  signUp: (email: string, password: string, name?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
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
        // Handle case where SATS user record doesn't exist - try to create it
        console.warn("SATS user record not found for user:", userId);
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const fallbackName = userData.user.user_metadata?.name || 
                               userData.user.user_metadata?.full_name || 
                               userData.user.email?.split('@')[0] || 'User';
            
            const { data: newSatsUser, error: insertError } = await supabase
              .from("sats_users_public")
              .insert({
                auth_user_id: userId,
                name: fallbackName,
                role: 'user'
              })
              .select()
              .single();
            
            if (!insertError && newSatsUser) {
              setSatsUser(newSatsUser as SATSUser);
            } else {
              console.error("Failed to create SATS user record:", insertError);
              setSatsUser(null);
            }
          } else {
            setSatsUser(null);
          }
        } catch (createError) {
          console.error("Error creating fallback SATS user:", createError);
          setSatsUser(null);
        }
      }
    } catch (error) {
      console.error("Error fetching SATS user:", error);
      setSatsUser(null);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Fetch SATS user data when user logs in
        if (session?.user) {
          setTimeout(() => {
            fetchSATSUser(session.user.id);
          }, 0);
        } else {
          setSatsUser(null);
        }
        
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchSATSUser(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, name?: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: name ? { name } : undefined,
      }
    });
    
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/reset-password`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
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
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};