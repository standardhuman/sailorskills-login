# Sailorskills Login Service

Centralized authentication for all Sailorskills services using Supabase Auth with SSO.

**Production:** https://login.sailorskills.com
**Platform:** Vercel

## Features

- Email/password authentication
- Customer signup
- Password reset
- SSO with `.sailorskills.com` cookie domain
- Role-based access control integration
- Redirect URL support

## Development

```bash
npm install
npm run dev
```

Visit: http://localhost:5179/login.html

## Environment Variables

Required in Vercel:

```
VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
```

See `.env.example` for template.

## Deployment

### Initial Setup

1. **Build locally:**
   ```bash
   npm run build
   ```

2. **Deploy to Vercel:**
   ```bash
   vercel
   ```

3. **Configure domain:**
   - Go to Vercel Dashboard → sailorskills-login → Settings → Domains
   - Add domain: `login.sailorskills.com`
   - Update DNS: Add CNAME pointing to `cname.vercel-dns.com`

4. **Set environment variables:**
   - Go to Settings → Environment Variables
   - Add for all environments (Production, Preview, Development):
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`

5. **Redeploy with env vars:**
   ```bash
   vercel --prod
   ```

### Subsequent Deployments

```bash
npm run build
vercel --prod
```

## Testing

Test accounts (development):
- Customer: customer-test@sailorskills.com / TestCustomer123!
- Staff: staff-test@sailorskills.com / TestStaff123!
- Admin: admin-test@sailorskills.com / TestAdmin123!

## Architecture

- **Shared Auth Module:** `@sailorskills/shared/auth`
- **Cookie Domain:** `.sailorskills.com` (enables SSO across subdomains)
- **Session Duration:** 7 days
- **Auth Flow:** PKCE for enhanced security

## URLs

- Login: `/login.html`
- Signup: `/signup.html`
- Password Reset: `/reset-password.html`

All pages redirect after successful authentication to:
1. URL specified in `?redirect=` query parameter
2. Default: `https://portal.sailorskills.com`
