import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: name.trim() },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        setMessage("Account created successfully.");
      } else {
        setMessage(
          "Registration successful! Check your email and click the verification link before logging in.",
        );
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <h1>Create your account</h1>
        <p className="subtitle">Register to access your workspace.</p>

        <label className="field">
          <span>Your name</span>
          <span className="input-wrap">
            <input
              type="text"
              autoComplete="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </span>
        </label>

        <label className="field">
          <span>Your email</span>
          <span className="input-wrap">
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </span>
        </label>

        <label className="field">
          <span>Create password</span>

          <span className="input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button
              className="eye-button"
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </span>
        </label>

        {error && <p className="login-error">{error}</p>}
        {message && <p className="success">{message}</p>}

        <button className="continue-button" disabled={busy}>
          {busy ? "Creating account..." : "Create account →"}
        </button>

        <div className="invite-note">
          <p>
            Already registered?{" "}
            <Link to="/login" className="register-link">
              Sign in
            </Link>
          </p>
        </div>
      </form>
    </main>
  );
}
