import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext(null);
const ACTIVE_TENANT_KEY = "archscale.activeTenant";

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [role, setRole] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadAccess = useCallback(async (userId, tenantSlug) => {
    const { data: platformAdmin } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (platformAdmin) {
      setRole("platform_admin");
      setTenant(null);
      return { role: "platform_admin", tenants: null };
    }
    let query = supabase
      .from("tenant_memberships")
      .select("tenant_id, role, tenants!inner(id, name, slug, is_active)")
      .eq("user_id", userId)
      .eq("status", "active")
      .eq("tenants.is_active", true)
      .limit(1);

    if (tenantSlug) query = query.eq("tenants.slug", tenantSlug.trim().toLowerCase());

    const { data, error } = await query.maybeSingle();
    if (error || !data) {
      setRole(null);
      setTenant(null);
      return null;
    }

    setRole(data.role);
    setTenant(data.tenants);
    return data;
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (!error && data.session?.user) {
        await loadAccess(data.session.user.id, localStorage.getItem(ACTIVE_TENANT_KEY));
      }
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    }

    initialize();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      Promise.resolve().then(async () => {
        if (nextSession?.user) {
          await loadAccess(nextSession.user.id, localStorage.getItem(ACTIVE_TENANT_KEY));
        } else {
          setRole(null);
          setTenant(null);
        }
        if (active) setLoading(false);
      });
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadAccess]);

  const signIn = async (email, password, tenantSlug) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return { data, error };
    const access = await loadAccess(data.user.id, tenantSlug);
    if (!access) {
      await supabase.auth.signOut();
      return { data: null, error: new Error("You do not have access to this active tenant.") };
    }
    if (access.tenants?.slug) localStorage.setItem(ACTIVE_TENANT_KEY, access.tenants.slug);
    else localStorage.removeItem(ACTIVE_TENANT_KEY);
    return { data, error: null };
  };

  const signOut = async () => {
    localStorage.removeItem(ACTIVE_TENANT_KEY);
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, tenant, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
