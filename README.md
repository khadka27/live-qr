# Live QR - Secure Dynamic QR Platform

Live QR is a production-ready, full-stack platform built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, **Prisma**, **PostgreSQL**, and **Redis**.

The platform is designed to generate cryptographically secure QR codes that automatically rotate their tokens every 60 seconds (or a custom duration). The real destination URL is never exposed inside the QR code; instead, the QR contains a secure random token that is validated by the backend before a 302 redirection is executed.

---

## Key Features

1. **Dashboard Workspace**: Manage QR codes, track scan frequencies, and download vector SVGs or raster PNGs.
2. **Dynamic 60s Rotations**: Tokens automatically rotate on schedule.
3. **GDPR Compliant Analytics**: Logs geolocations, browsers, operating systems, and traffic referrers using SHA-256 hashed IP addresses.
4. **Developer REST Portal**: Programmatic API key generation, active token rotation triggers, and structured webhook scan payloads.
5. **Access Control**: Role-based permissions (ADMIN, MANAGER, VIEWER) for team collaboration.
6. **Bulk Upload**: CSV parsing imports to generate collections of QRs in batches.

---

## Tech Stack

* **Frontend**: Next.js 15+ (App Router), React 19, Tailwind CSS, Recharts
* **Backend**: Next.js Server Actions & API Routes, NextAuth.js v5 (Auth.js)
* **Database & Caching**: PostgreSQL, Prisma ORM, Redis (for token lookups & rate limiting)

---

## Getting Started

### Prerequisites

* Node.js (v18+)
* PostgreSQL (v14+)
* Redis (v6+)

### Installation

1. **Clone the repository and install dependencies**:
   ```bash
   pnpm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the root of the project:
   ```env
   # Database Connection (PostgreSQL Unix Socket fallback for local peer authorization)
   DATABASE_URL="postgresql://khadka27@localhost:5432/liveqr_db?host=/var/run/postgresql"

   # Redis Connection URI
   REDIS_URL="redis://localhost:6379"

   # NextAuth Configurations
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="3e7f41cf65d49ad768a3f8510bfb7ee793c1cf3d8ff436c646b5a37213401569"

   # Public App URL for Redirection Encoding
   NEXT_PUBLIC_APP_URL="http://localhost:3000"

   # Cron rotation authorization token
   CRON_SECRET="liveqr_rotation_cron_secret_77281_xyz"
   ```

3. **Synchronize the Database**:
   Push the Prisma schema model declarations and compile the client:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Run the Development Server**:
   ```bash
   pnpm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the application workspace.

---

## Admin Bootstrapping

The system does not require seed scripts to get started. The first user to register an account on the sign-up page (`/auth/signin`) is automatically assigned the **ADMIN** role. Subsequent registrations receive the **VIEWER** role, which can be upgraded via the Admin Settings page.

---

## Docker Compose Support

For dockerized deployments, postgres and redis services are predefined in the root configuration:
```bash
docker compose up -d
```

---

## Cron Job Rotation Setup

To trigger the automated rotation loop of expired tokens, configure a cron worker (e.g. crontab, Vercel Crons, Google Cloud Scheduler) to ping the cron API endpoint once per minute:
```bash
curl -X POST -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/rotate
```
