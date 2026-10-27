import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

async function platform(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke("platform-admin", { body: { action, ...payload } });
  if (error) {
    try { throw new Error((await error.context?.json())?.error ?? error.message); } catch (cause) { throw cause instanceof Error ? cause : new Error(error.message); }
  }
  return data;
}

export default function Dashboard() {
  const { user, role, tenant, signOut } = useAuth();
  const [data, setData] = useState({ tenants: [], memberships: [] });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const isPlatform = role === "platform_admin";

  const refresh = async () => {
    if (!isPlatform) return;
    try { setData(await platform("overview")); } catch (cause) { setError(cause.message); }
  };
  useEffect(() => { refresh(); }, [isPlatform]);

  const action = async (kind, payload, confirmation) => {
    if (confirmation && !window.confirm(confirmation)) return;
    setBusy(true); setError("");
    try { await platform(kind, payload); await refresh(); } catch (cause) { setError(cause.message); }
    setBusy(false);
  };
  const createTenant = async (event) => {
    event.preventDefault();
    await action("createTenant", { name, slug });
    setName(""); setSlug("");
  };

  if (!isPlatform) return <TenantDashboard user={user} role={role} tenant={tenant} signOut={signOut} />;
  return <main className="dashboard platform-dashboard">
    <header className="dashboard-header"><div><p className="eyebrow">ARCHSCALE CONTROL</p><h1>Platform administration</h1><p className="muted">Signed in as {user?.email}</p></div><button className="secondary-button" onClick={signOut}>Log out</button></header>
    {error && <p className="error" role="alert">{error}</p>}
    <section className="create-tenant panel"><div><h2>Create tenant</h2><p>Start a new, isolated workspace for a client, office, or organization.</p></div><form onSubmit={createTenant}><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tenant name" required /><input value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} placeholder="tenant-slug" required /><button disabled={busy}>Create tenant</button></form></section>
    <section className="tenant-grid">
      {data.tenants.map((item) => {
        const members = data.memberships.filter((member) => member.tenant_id === item.id);
        return <article className="tenant-card" key={item.id}>
          <header><div><span className={`status-dot ${item.is_active ? "active" : "disabled"}`} /> <strong>{item.name}</strong><code>{item.slug}</code></div><div className="card-actions"><button onClick={() => action("setTenantActive", { tenantId: item.id, isActive: !item.is_active })}>{item.is_active ? "Disable" : "Enable"}</button><button className="danger" onClick={() => action("deleteTenant", { tenantId: item.id }, `Delete ${item.name}? This permanently removes its memberships.`)}>Delete</button></div></header>
          <div className="tenant-card-body"><p className="member-count">{members.length} member{members.length === 1 ? "" : "s"} · <Link to="/invite-members">Invite member</Link></p><div className="member-list">{members.length ? members.map((member) => <div className="member-row" key={member.user_id}><div><strong>{member.email}</strong><small>{member.status}</small></div><select value={member.role} onChange={(e) => action("setMemberRole", { tenantId: item.id, userId: member.user_id, role: e.target.value })}><option value="admin">Admin</option><option value="user">User</option></select><button className="danger" onClick={() => action("removeMember", { tenantId: item.id, userId: member.user_id }, `Remove ${member.email} from ${item.name}?`)}>Remove</button></div>) : <p className="muted">No members yet.</p>}</div></div>
        </article>;
      })}
    </section>
  </main>;
}

function TenantDashboard({ user, role, tenant, signOut }) {
  return <main className="dashboard"><header className="dashboard-header"><div><h1>{role === "admin" ? "Admin dashboard" : "Dashboard"}</h1></div><button className="secondary-button" onClick={signOut}>Log out</button></header><section className="welcome-card"><p className="muted">Signed in as</p><h2>{user?.email}</h2><p>Role: <span className="role-badge">{role}</span></p><p>Workspace: {tenant?.name}</p></section>{role === "admin" && <section className="panel"><h2>Team invitations</h2><p>Invite users into your workspace.</p><Link className="text-link" to="/invite-members">Invite a member</Link></section>}</main>;
}
