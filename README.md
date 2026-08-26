# Sefalana Portal Prototype

This repository contains a Next.js (TypeScript) prototype for Sefalana — a public customer portal and a protected admin dashboard. It includes:

- Tailwind CSS-styled frontend (App Router)
- RESTful API routes modeled after Express within Next.js
- PostgreSQL schema and seed data (schema.sql)
- Database helper (lib/db.ts) using pg Pool
- Security middleware (middleware/security.ts) with JWT auth, rate-limiting, and sanitization

Environment variables (set in Vercel or .env):

- DATABASE_URL: your Postgres connection string
- JWT_SECRET: strong JWT secret
- NODE_ENV: development | production

Quick start

1. Install dependencies

   npm install

2. Initialize the database

   psql "$DATABASE_URL" -f schema.sql

3. Run development server

   npm run dev

Notes

- The SQL seeds an admin user with email `admin@sefalana.co.bw` and password `AdminPass123!`. Change this in production.
- Replace the in-memory rate limiter with Redis for production-scale deployments.
