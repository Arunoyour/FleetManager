# Fleet Manager

Owner-only PWA for a lorry fleet: record trips with their earnings and expenses, track credit trips until they are paid, and see daily cash balance and reports by vehicle, trip, expense type and driver.

Built with Next.js (App Router, TypeScript), Tailwind CSS, Prisma and PostgreSQL. Phone-first for data entry; laptop-friendly for reports.

## Getting started

Requirements: Node.js 20+ and PostgreSQL 14+.

```bash
npm install
cp .env.example .env        # then set DATABASE_URL and SEED_OWNER_PIN
npm run db:migrate          # creates the tables
npm run db:seed             # 10 default expense types + the first owner PIN
npm run dev
```

Open http://localhost:3000 and sign in with the PIN you set in `SEED_OWNER_PIN`. Set `SEED_SAMPLE_DATA="1"` before seeding to also create sample vehicles, drivers and four weeks of trips.

If every PIN is ever forgotten, reset one in the database (there is no in-app recovery by design), for example by temporarily emptying the `User` table and running `npm run db:seed` again with a new `SEED_OWNER_PIN`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run typecheck` / `npm run lint` | Static checks |
| `npm run db:migrate` | Create/apply migrations in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Seed expense types and the first PIN |

## Screens

| Area | Route |
| --- | --- |
| MPIN login | `/login` |
| Dashboard | `/` |
| Select vehicle → Add trip | `/trips/new` → `/trips/new/[vehicleId]` |
| Trip list, detail, edit | `/trips`, `/trips/[id]`, `/trips/[id]/edit` |
| Daily balance (day → trips → expenses) | `/balance` |
| Credit management (Pending / Paid, Undo) | `/credit` |
| Reports 11–17, table/chart, Excel export, print to PDF | `/reports` |
| Masters | `/masters/vehicles`, `/masters/drivers`, `/masters/expense-types`, `/masters/pins` |

## Business rules

- **Money** is stored as integer paise.
- **Daily balance is cash basis:** a credit trip's expenses count on the trip date and its earning on the date it is marked paid. Other reports use the trip date and count credit earnings in full, split into received and pending.
- **Credit** is paid in full only. Undo moves a paid trip back to pending. A paid trip's amount and credit tick are locked until the payment is undone.
- **Masters** are never deleted, only deactivated; inactive items are hidden from Add Trip but stay on old trips and in reports.
- **Trips** are soft-deleted.
- **MPIN:** exactly 6 digits, stored as an argon2 hash. 5 wrong tries on a device cause a 5-minute wait. Sessions last 30 days and require the PIN again after 15 minutes idle. The last active PIN cannot be deactivated, and deactivating a PIN signs it out everywhere.
