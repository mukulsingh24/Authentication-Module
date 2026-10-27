import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function AcceptInvite() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Verifying your invitation…");
  const [invitedTenant, setInvitedTenant] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function verifyInvite() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      // With implicit flow Supabase has already exchanged the URL fragment.
      let { data: { session } } = await supabase.auth.getSession();
      if (!session && tokenHash && type === "invite") {
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: "invite",
        });
        if (verifyError) {
          if (!cancelled) setError("This invitation is invalid or has expired. Ask an administrator for a new one.");
          return;
        }
        ({ data: { session } } = await supabase.auth.getSession());
      }

      if (cancelled) return;
      if (!session) {
        setError("Open this page using the invitation link from your email.");
        return;
      }
      const { data: membership } = await supabase
        .from("tenant_memberships")
        .select("tenants!inner(name, slug)")
        .eq("user_id", session.user.id)
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();
      setStatus("");
      setInvitedTenant(membership?.tenants ?? null);
      setReady(true);
    }
    verifyInvite();
    return () => { cancelled = true; };
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { full_name: name.trim() },
    });
    if (updateError) {
      setError(updateError.message);
      setBusy(false);
      return;
    }

    const { error: membershipError } = await supabase.rpc("accept_my_invitations");
    if (membershipError) {
      setError("Your password was saved, but access could not be activated. Contact your administrator.");
      setBusy(false);
      return;
    }

    await supabase.auth.signOut();
    const tenantHint = invitedTenant?.slug ? ` Tenant: ${invitedTenant.slug}.` : "";
    navigate("/login", {
      replace: true,
      state: { message: `Your account is ready.${tenantHint} Sign in now.` },
    });
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Accept your invitation</h1>
        <p className="muted">Create a password to join your ArchScale workspace.</p>
        {invitedTenant && <p className="success">Joining: {invitedTenant.name} (tenant slug: {invitedTenant.slug})</p>}
        {status && <p className="muted">{status}</p>}
        {error && <p className="error" role="alert">{error}</p>}

        {ready && <>
          <label htmlFor="name">Full name</label>
          <input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <label htmlFor="confirm-password">Confirm password</label>
          <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          <button disabled={busy}>{busy ? "Setting up…" : "Activate account"}</button>
        </>}

        <p className="footer-text"><Link to="/login">Back to login</Link></p>
      </form>
    </main>
  );
}
