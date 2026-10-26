
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user, role, signOut } = useAuth();

  async function handleLogout() {
    const { error } = await signOut();

    if (error) {
      alert(error.message);
    }
  }

  const titles = {
    super_admin: "Super Admin Dashboard",
    admin: "Admin Dashboard",
    user: "User Dashboard",
  };

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <h1>{titles[role] ?? "Dashboard"}</h1>
        </div>
        <button className="secondary-button" onClick={handleLogout}>
          Log out
        </button>
      </header>

      <section className="welcome-card">
        <p className="muted">Signed in as</p>
        <h2>{user?.email}</h2>
        <p>
          Role: <span className="role-badge">{role}</span>
        </p>
      </section>

      {role === "super_admin" && (
        <section className="panel">
          <h2>Super Admin access</h2>
          <p>You can access features reserved for Super Admins.</p>
        </section>
      )}

      {role === "admin" && (
        <section className="panel">
          <h2>Admin access</h2>
          <p>You can access features reserved for Admins.</p>
        </section>
      )}
    </main>
  );
}
