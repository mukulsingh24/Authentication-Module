import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "Sign in is required" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) return json({ error: "Invalid session" }, 401);

  let body: { email?: string; role?: string; tenantId?: string };
  try { body = await request.json(); } catch { return json({ error: "Invalid request body" }, 400); }
  const email = body.email?.trim().toLowerCase();
  const role = body.role;
  const tenantId = body.tenantId;
  if (!email || !tenantId || !["user", "admin"].includes(role ?? "")) {
    return json({ error: "Email, tenant, and a valid role are required" }, 400);
  }

  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const { data: platformAdmin } = await adminClient
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  const { data: inviter } = await adminClient
    .from("tenant_memberships")
    .select("role, status")
    .eq("tenant_id", tenantId)
    .eq("user_id", user.id)
    .maybeSingle();
  const isTenantAdmin = inviter?.status === "active" && inviter.role === "admin";
  if (!platformAdmin && !isTenantAdmin) {
    return json({ error: "You cannot invite members to this tenant" }, 403);
  }
  if (role === "admin" && !platformAdmin) {
    return json({ error: "Only a platform administrator can invite a tenant admin" }, 403);
  }

  const appUrl = Deno.env.get("APP_URL");
  if (!appUrl) return json({ error: "APP_URL is not configured" }, 500);
  const { data: invitation, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl.replace(/\/$/, "")}/accept-invite`,
  });
  if (inviteError || !invitation.user) return json({ error: inviteError?.message ?? "Could not create invitation" }, 400);

  const { error: membershipError } = await adminClient.from("tenant_memberships").upsert({
    tenant_id: tenantId,
    user_id: invitation.user.id,
    role,
    status: "pending",
  }, { onConflict: "tenant_id,user_id" });
  if (membershipError) return json({ error: "Invitation email was sent, but membership setup failed. Contact support." }, 500);

  return json({ ok: true });
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
