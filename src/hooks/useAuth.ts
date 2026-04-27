/**
 * useAuth Hook
 *
 * Manages Supabase authentication state:
 * - Login/Signup/Logout
 * - Session persistence
 * - Role-based access
 * - User profile
 */

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: "user" | "reviewer" | "admin";
  avatarUrl?: string;
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    error: null,
  });

  // Map Supabase user to our AuthUser shape
  const mapUser = useCallback((user: User | null, profile?: any): AuthUser | null => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || "",
      displayName:
        profile?.display_name ||
        user.user_metadata?.display_name ||
        user.email?.split("@")[0] ||
        "User",
      role: profile?.role || user.app_metadata?.role || "user",
      avatarUrl: profile?.avatar_url || user.user_metadata?.avatar_url,
    };
  }, []);

  // Fetch user profile from our users table
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("users" as any)
        .select("*")
        .eq("id", userId)
        .single();
      return data;
    } catch {
      return null;
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: mapUser(session.user, profile),
            session,
            loading: false,
            error: null,
          });
        } else {
          setState({ user: null, session: null, loading: false, error: null });
        }
      } catch (err: any) {
        if (mounted) {
          setState({ user: null, session: null, loading: false, error: err.message });
        }
      }
    };

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (session?.user) {
          const profile = await fetchProfile(session.user.id);
          setState({
            user: mapUser(session.user, profile),
            session,
            loading: false,
            error: null,
          });
        } else {
          setState({ user: null, session: null, loading: false, error: null });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [mapUser, fetchProfile]);

  // Auth actions
  const signIn = async (email: string, password: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName || email.split("@")[0] },
      },
    });
    if (error) {
      setState((s) => ({ ...s, loading: false, error: error.message }));
      throw error;
    }
  };

  const signOut = async () => {
    setState((s) => ({ ...s, loading: true }));
    await supabase.auth.signOut();
    setState({ user: null, session: null, loading: false, error: null });
  };

  const clearError = () => setState((s) => ({ ...s, error: null }));

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    clearError,
    isAuthenticated: !!state.user,
    isAdmin: state.user?.role === "admin",
    isReviewer: state.user?.role === "reviewer" || state.user?.role === "admin",
  };
}
