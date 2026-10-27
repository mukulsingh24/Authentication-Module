# ArchScale authentication

This Vite client uses Supabase Auth and a tenant membership table. It supports:

- tenant-scoped email/password sign-in and logout;
- Supabase invitation emails and invite acceptance (name and password setup);
- email verification through the invitation link;
- password-recovery emails and password resets;
- active-tenant and role checks before a dashboard is shown.

Public registration is intentionally disabled in the UI. Administrators invite new members instead.

## Local client setup

Create `client/.env` (it is ignored by Git):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_OR_ANON_KEY
```

Then run:

```sh
npm install
npm run dev
```

## Supabase setup

1. Install the Supabase CLI and link this repository to the Supabase project.
2. Apply the schema in `../supabase/migrations/20261027000000_tenant_auth.sql` with `supabase db push` (or run it in the SQL editor).
3. Create the first tenant and its `super_admin` membership using the commented bootstrap SQL at the end of that migration.
4. Add the deployed client URL to **Authentication → URL Configuration → Redirect URLs**:
   - `https://your-app.example/accept-invite`
   - `https://your-app.example/reset-password`
   - local equivalents, for example `http://localhost:5173/accept-invite` and `http://localhost:5173/reset-password`.
5. In **Authentication → Providers → Email**, keep email enabled. Configure SMTP for production; Supabase's default mail service is only suitable for testing.
6. Set the Edge Function secret and deploy the invitation sender:

```sh
supabase secrets set APP_URL=https://your-app.example
supabase functions deploy send-tenant-invite
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are supplied to hosted Edge Functions by Supabase. Never put the service-role key in the Vite environment file.

The Supabase invitation email template should use its supplied confirmation URL. Its redirect lands on `/accept-invite`, where the client verifies the one-time invitation token, lets the recipient choose a password, and activates only their pending membership.

## Tenant login behavior

The login form asks for a tenant slug. A valid password alone is insufficient: the account must have an active membership in an active tenant with that slug. Disabled tenants and non-members are signed out and cannot reach protected routes.
