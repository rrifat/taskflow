# Taskflow

Taskflow is a take-home assessment project built with the Next.js App Router. The application will evolve into a Jira/Trello-style board with secure session-based authentication, category and ticket management, drag-and-drop interactions, expiry reminders, and ticket history.

## Getting Started

Install dependencies and run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Current Project Structure

```text
src/
  app/
    (auth)/
      login/
    (board)/
      board/
    api/
      health/
  lib/
    config/
```

At this stage the repository contains:

- the base Next.js App Router scaffold
- placeholder routes for `/login` and `/board`
- a simple health endpoint at `/api/health`
- shared app metadata/config for upcoming features

## Planned Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Prisma ORM
- Prisma Postgres
- Route Handlers for API mutations
- Database-backed session cookies
