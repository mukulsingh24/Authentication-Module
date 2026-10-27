
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage({ config }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [tenant, setTenant] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const { error } = await signIn(email.trim(), password, tenant);

      if (error) {
        setError(error.message);
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch {
      setError("Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main
      className="login-page"
      style={{ "--brand-color": config.primaryColor }}
    >
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Good to see you</h1>
        <p className="subtitle">{config.tagline}</p>

        <label className="field">
          <span>Tenant <em>(not needed for platform admins)</em></span>
          <span className="input-wrap">
            <input
              type="text"
              autoComplete="organization"
              placeholder="Your workspace slug"
              value={tenant}
              onChange={(e) => setTenant(e.target.value)}
            />
          </span>
        </label>

        <label className="field">
          <span>Your ID</span>
          <span className="input-wrap">
            <input
              type="email"
              autoComplete="username"
              placeholder="Enter your email ID"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </span>
        </label>

        <label className="field">
          <span>Your password</span>
          <span className="input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              className="eye-button"
              type="button"
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>

        {config.showForgotPassword && (
          <div className="login-options">
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
        )}

        {error && <p className="login-error" role="alert">{error}</p>}
        {location.state?.message && <p className="success" role="status">{location.state.message}</p>}

        <button className="continue-button" disabled={busy}>
          {busy ? "Signing in..." : "Continue →"}
        </button>

        <div className="invite-note">
          <p>New here? Ask a workspace administrator to send you an invitation.</p>
        </div>
      </form>
    </main>
  );
}
