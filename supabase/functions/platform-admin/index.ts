import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers });
  const token = request.headers.get("Authorization");
  if (!token) return reply({ error: "Sign in is required" }, 401);
  const userClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: token } } });
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return reply({ error: "Invalid session" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const { data: platformAdmin } = await admin.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!platformAdmin) return reply({ error: "Platform administrator access is required" }, 403);

  const body = await request.json().catch(() => ({}));
  if (body.action === "overview") {
    const [{ data: tenants, error: tenantError }, { data: memberships, error: membershipError }, { data: users, error: userError }] = await Promise.all([
      admin.from("tenants").select("id, name, slug, is_active, created_at").order("name"),
      admin.from("tenant_memberships").select("tenant_id, user_id, role, status").order("created_at"),
      admin.auth.admin.listUsers({ perPage: 1000 }),
    ]);
    if (tenantError || membershipError || userError) return reply({ error: "Could not load platform data" }, 500);
    const emails = Object.fromEntries(users.users.map((item) => [item.id, item.email]));
    return reply({ tenants, memberships: memberships.map((item) => ({ ...item, email: emails[item.user_id] ?? "Unknown user" })) });
  }
  if (body.action === "createTenant") {
    const name = String(body.name ?? "").trim(); const slug = String(body.slug ?? "").trim().toLowerCase();
    if (!name || !/^[a-z0-9-]+$/.test(slug)) return reply({ error: "Enter a tenant name and a lowercase slug using letters, numbers, or hyphens." }, 400);
    const { error } = await admin.from("tenants").insert({ name, slug });
    return error ? reply({ error: error.message }, 400) : reply({ ok: true });
  }
  if (body.action === "setTenantActive") {
    const { error } = await admin.from("tenants").update({ is_active: Boolean(body.isActive) }).eq("id", body.tenantId);
    return error ? reply({ error: error.message }, 400) : reply({ ok: true });
  }
  if (body.action === "deleteTenant") {
    const { error } = await admin.from("tenants").delete().eq("id", body.tenantId);
    return error ? reply({ error: error.message }, 400) : reply({ ok: true });
  }
  if (body.action === "setMemberRole") {
    if (!["admin", "user"].includes(body.role)) return reply({ error: "Invalid role" }, 400);
    const { error } = await admin.from("tenant_memberships").update({ role: body.role }).eq("tenant_id", body.tenantId).eq("user_id", body.userId);
    return error ? reply({ error: error.message }, 400) : reply({ ok: true });
  }
  if (body.action === "removeMember") {
    const { error } = await admin.from("tenant_memberships").delete().eq("tenant_id", body.tenantId).eq("user_id", body.userId);
    return error ? reply({ error: error.message }, 400) : reply({ ok: true });
  }
  return reply({ error: "Unknown action" }, 400);
});
