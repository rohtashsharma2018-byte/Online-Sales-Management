import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { User } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  role: "admin" | "user" | "blocked" | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, role: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "user" | "blocked" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // If Supabase is not configured, don't wait for sessions
    if (!isSupabaseConfigured) {
      console.warn("Supabase credentials missing, auth disabled.");
      setLoading(false);
      return;
    }

    // Safety timeout to prevent infinite loading if Supabase hangs
    const timeoutId = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Auth initialization timed out, clearing loading state.");
        setLoading(false);
      }
    }, 2000); // Shorter timeout for better UX

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      if (session) {
        setUser(session.user);
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    }).catch(err => {
      console.error("Supabase session error:", err);
      if (mounted) setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      if (session) {
        setUser(session.user);
        fetchProfile(session.user);
      } else {
        setUser(null);
        setRole(null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const fetchProfile = async (currentUser: User) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", currentUser.id)
        .single();

      if (error && error.code === "PGRST116") {
        // Extract phone from synthetic email if present
        const phone = currentUser.email?.endsWith("@modarnet.internal") 
          ? currentUser.email.split("@")[0] 
          : currentUser.phone || "";

        const { data: newProfile, error: createError } = await supabase
          .from("profiles")
          .insert({
            id: currentUser.id,
            email: currentUser.email || "",
            phone: phone,
            name: currentUser.user_metadata?.full_name || "User",
            role: "user",
            address: currentUser.user_metadata?.address || "",
          })
          .select("role")
          .single();

        if (createError) throw createError;
        setRole(newProfile.role as any);
      } else if (data) {
        setRole(data.role as any);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setRole("user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
