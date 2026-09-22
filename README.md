# Global Gate LeadFlow

Lead management CRM for Global Gate Education Consultancy. Built with Next.js 15, TypeScript, Tailwind CSS, Prisma, and PostgreSQL.

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string (Neon, Supabase, or local)
- `AUTH_SECRET` — Random 32+ character string for session encryption
- `GOOGLE_*` — Google Sheets credentials (optional, for sync feature)

### 3. Run database migrations
```bash
npx prisma migrate dev --name init
```

Or push the schema directly (for initial setup):
```bash
npm run db:push
```

### 4. Seed demo data
```bash
npm run db:seed
```

This creates:
- **Admin:** admin@globalgate.edu / Admin@123456
- **Counsellors:** priya@globalgate.edu, rohan@globalgate.edu, sunita@globalgate.edu, bikash@globalgate.edu, anjali@globalgate.edu — all use password: Counsellor@123456
- **Receptionist:** reception@globalgate.edu / Reception@123456
- 3 branches, all reference data, 20 sample leads

### 5. Start development server
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Google Sheets Setup (optional)

1. Create a Google Cloud project
2. Enable the Google Sheets API
3. Create a Service Account and download the JSON key
4. Share your target spreadsheet with the service account email
5. Add the credentials to `.env.local`

A failed Sheets sync never blocks lead creation. Failed syncs can be retried from **Admin → Settings → Google Sheets**.

## Deployment (Vercel + Neon)

1. Push to GitHub
2. Import in Vercel — it auto-detects Next.js
3. Add environment variables in Vercel dashboard
4. Use Neon or Supabase for hosted PostgreSQL
5. Run `npx prisma migrate deploy` after first deploy

## First Admin User

After seeding, log in with admin@globalgate.edu / Admin@123456. Change the password immediately in a production environment.

## Project Structure

```
app/
  login/              — Login page
  admin/              — Admin views (dashboard, leads, users, reports, settings)
  counsellor/         — Counsellor views (dashboard, leads, follow-ups)
  reception/          — Receptionist views (dashboard, leads)
  leads/              — Shared lead pages (new lead, lead detail)
  api/                — All API routes

components/
  layout/             — Sidebar layouts per role
  leads/              — Lead form, table, status badge
  dashboard/          — KPI cards
  ui/                 — shadcn/ui primitives

lib/                  — Auth, DB, session, utils, validations, Google Sheets
services/             — Lead creation, notifications, Sheets sync
prisma/               — Schema, migrations, seed
types/                — TypeScript types
```
