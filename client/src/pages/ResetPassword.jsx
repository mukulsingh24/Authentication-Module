
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const { error } = await supabase.auth.updateUser({ password });

    setBusy(false);

    if (error) {
      setError(error.message);
      return;
    }

    await supabase.auth.signOut();
    navigate("/login", {
      replace: true,
      state: { message: "Password updated. You can sign in now." },
    });
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <h1>Set a new password</h1>
        <p className="muted">
          Open this page through the recovery link sent to your email.
        </p>

        <label htmlFor="password">New password</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="error">{error}</p>}

        <button disabled={busy}>
          {busy ? "Updating..." : "Update password"}
        </button>

        <p className="footer-text">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </main>
  );
}
