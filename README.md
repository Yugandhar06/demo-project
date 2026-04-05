# FinancePro Vercel Demo

FinancePro is a plain HTML finance dashboard backed by Vercel-style serverless API routes.

## What It Includes

- Role-based access control for `viewer`, `analyst`, and `admin`
- Session-based login with cookie auth
- Financial record CRUD with soft delete
- Dashboard summary and insights APIs
- User management and audit logging

## Tech Shape

- Frontend: plain HTML, CSS, vanilla JavaScript
- Backend: Vercel serverless functions in `api/`
- Storage: seeded JSON store for demo use

## Important Demo Note

This version uses a JSON-backed demo store so it works without a hosted database or external packages. It is suitable for internship demonstration and local testing, but for production persistence on Vercel you should swap the storage layer to Supabase, Neon, PlanetScale, or another hosted database.

## Seeded Accounts

- `admin@financepro.demo` / `Admin@123`
- `analyst@financepro.demo` / `Analyst@123`
- `viewer@financepro.demo` / `Viewer@123`

## Pages

- `/`
- `/dashboard`
- `/transactions`
- `/insights`
- `/users`
- `/audit-log`

## API Routes

- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/me`
- `/api/records`
- `/api/records/:id`
- `/api/dashboard/summary`
- `/api/insights/trends`
- `/api/users`
- `/api/users/:id`
- `/api/users/:id/status`
- `/api/audit-logs`

## Run Notes

This repo is structured for Vercel deployment. For local development, the simplest path is `vercel dev` after installing the Vercel CLI on your machine.
