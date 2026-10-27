import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

export default function InviteMembers() {
  const { tenant, role: currentRole } = useAuth();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState(tenant?.id ?? "");

  useEffect(() => {
    if (currentRole !== "platform_admin") return;
    supabase.from("tenants").select("id, name, slug").eq("is_active", true).order("name")
      .then(({ data }) => setTenants(data ?? []));
  }, [currentRole]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    const { error: functionError } = await supabase.functions.invoke("send-tenant-invite", {
      body: { email: email.trim(), role, tenantId },
    });
    setBusy(false);
    if (functionError) {
      let details = functionError.message || "The invitation could not be sent.";
      try {
        const body = await functionError.context?.json();
        if (body?.error) details = body.error;
      } catch {
        // The generic message is still useful when the response has no JSON body.
      }
      setError(details);
      return;
    }
    setMessage(`Invitation sent to ${email.trim()}.`);
    setEmail("");
  }

  const canAssignAdmin = currentRole === "platform_admin";
  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Invite a member</h1>
        <p className="muted">They will receive an email to create their password and join a workspace.</p>
        {currentRole === "platform_admin" && <>
          <label htmlFor="invite-tenant">Tenant</label>
          <select id="invite-tenant" value={tenantId} onChange={(e) => setTenantId(e.target.value)} required>
            <option value="">Choose a tenant</option>
            {tenants.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.slug})</option>)}
          </select>
        </>}
        <label htmlFor="invite-email">Email address</label>
        <input id="invite-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="invite-role">Role</label>
        <select id="invite-role" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="user">User</option>
          <option value="admin" disabled={!canAssignAdmin}>Admin</option>
        </select>
        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="success">{message}</p>}
        <button disabled={busy}>{busy ? "Sending…" : "Send invitation"}</button>
        <p className="footer-text"><Link to="/dashboard">Back to dashboard</Link></p>
      </form>
    </main>
  );
}
