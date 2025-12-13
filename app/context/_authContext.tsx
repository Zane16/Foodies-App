import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { supabase } from "../../supabase"; // adjust path if needed

// Type definitions for multi-tenant auth
type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  delivery_address: string | null;
  delivery_notes: string | null;
  role: "customer" | "vendor" | "deliverer" | "admin" | "superadmin";
  organization: string; // Old field (defaults to 'global')
  organization_id: string | null; // New field for multi-tenant support
  auth_provider: string | null;
  email_verified: boolean | null;
  last_login_at: string | null;
  status: "pending" | "approved" | "declined";
  latitude: number | null;
  longitude: number | null;
  profile_picture_url: string | null;
  header_image_url: string | null;
  created_at: string;
  updated_at: string;
};

type Organization = {
  id: string;
  name: string;
  slug: string;
  email_domains: string[];
  auth_methods: string[];
  logo_url: string | null;
  primary_color: string;
  status: string;
};

type AuthContextType = {
  user: any; // Supabase User object
  profile: Profile | null; // User profile with organization data
  organization: Organization | null; // Current organization
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>; // Re-fetch profile and org data
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile and organization data
  const fetchProfileAndOrganization = async (userId: string) => {
    try {
      // Fetch user profile with organization data
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*, organizations(*)")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError.message);
        setProfile(null);
        setOrganization(null);
        return;
      }

      if (profileData) {
        // Extract organization data from the joined query
        const orgData = profileData.organizations;
        delete profileData.organizations; // Remove nested object

        setProfile(profileData as Profile);
        setOrganization(orgData as Organization);

        // Update last_login_at timestamp
        await supabase
          .from("profiles")
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", userId);
      }
    } catch (error: any) {
      console.error("Error in fetchProfileAndOrganization:", error);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfileAndOrganization(user.id);
    }
  };

  useEffect(() => {
    // Check current session when app loads
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error fetching session:", error.message);
      }

      const sessionUser = data?.session?.user || null;
      setUser(sessionUser);

      // Fetch profile and organization if user is authenticated
      if (sessionUser) {
        await fetchProfileAndOrganization(sessionUser.id);
      }

      setLoading(false);
    };

    getSession();

    // Listen for auth state changes (login/logout)
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const sessionUser = session?.user || null;
      setUser(sessionUser);

      if (sessionUser) {
        // Fetch profile and organization on login
        await fetchProfileAndOrganization(sessionUser.id);
      } else {
        // Clear profile and organization on logout
        setProfile(null);
        setOrganization(null);
      }
    });

    // Cleanup subscription on unmount
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, organization, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

// Add a default export to satisfy Expo Router
export default function AuthContextComponent() {
  return null;
}
