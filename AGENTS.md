# Taskflow Agent Guide

This repository uses **Next.js 16 App Router**. Follow current Next.js 16 behavior and official docs rather than older Next.js habits.

## Core Next.js rules

- Use **Server Components by default**.
- Add `'use client'` only for interactive UI that needs state, event handlers, effects, drag-and-drop, or browser APIs.
- Prefer **Route Handlers** for mutations and auth endpoints in this project.
- Keep pages and layouts thin. Put reusable logic in `src/lib`.
- Do not read cookies, headers, `params`, or `searchParams` synchronously when Next.js expects async access.
- Prefer server-side data loading for authenticated pages when possible.
- Keep auth and authorization checks close to the server/data layer, not only in the UI.
- Avoid putting database code in Client Components.
- Avoid introducing Server Actions unless there is a clear benefit over Route Handlers.

## Build and tooling notes

- Next.js 16 uses **Turbopack by default** for `dev` and `build`.
- In this repo, if Turbopack causes local sandbox or tool issues, it is acceptable to use `next build --webpack` for verification.
- Check the official upgrade notes before relying on older patterns:
  - `https://nextjs.org/docs/app/guides/upgrading/version-16`
  - `https://nextjs.org/docs/app/getting-started/server-and-client-components`
  - `https://nextjs.org/docs/app/building-your-application/routing/route-handlers`
  - `https://nextjs.org/docs/app/guides/authentication`

## Project structure conventions

Start with this shared library structure:

```text
src/lib/
  config/
    app.ts
    features.ts
  db/
    client.ts
    tickets.ts
    users.ts
  utils/
    dates.ts
    tickets.ts
    validation.ts
  auth/
    session.ts
    password.ts
```

If the project grows, prefer evolving toward:

```text
src/lib/
  config/
    app.ts
    env.ts
    features.ts
  db/
    client.ts
    tickets.ts
    categories.ts
    users.ts
    history.ts
  auth/
    session.ts
    password.ts
  domain/
    tickets.ts
    categories.ts
    board.ts
  validation/
    common.ts
    auth.ts
    tickets.ts
    categories.ts
  utils/
    dates.ts
    strings.ts
```

### What belongs where

- `config/`: app metadata, environment-derived settings, feature flags.
- `db/`: Prisma client setup and database query modules only.
- `auth/`: password hashing, session creation/validation, cookie/session helpers.
- `utils/`: small pure helpers with no framework, database, or business-rule dependencies.
- `domain/`: business rules and use-case logic that are specific to the app domain.
- `validation/`: reusable schemas and validation logic when validation grows beyond a few tiny helpers.

### Organizing rule

- Organize shared code by **responsibility**, not by whether it is reused.
- “Shared” alone does not mean something belongs in `utils`.
- Use these distinctions:
  - `utils` = generic, pure helpers
  - `config` = application settings, metadata, feature flags, env-derived constants
  - `auth` = identity, password, session, cookie concerns
  - `db` = persistence and queries
  - `domain` = business rules and domain decisions
  - `validation` = schemas and shared validation contracts

### Boundaries to keep

- `src/lib/db/client.ts` is the only place that should initialize Prisma.
- `src/lib/db/*.ts` should not contain UI logic.
- `src/lib/utils/*` should not become a dumping ground for “shared but unclear” code.
- If something decides behavior or encodes business policy, it likely belongs in `domain/`, not `utils/`.
- If something is reused but tied to auth, keep it in `auth/`.
- If something is reused but is app/environment setup, keep it in `config/`.
- If logic becomes domain-heavy, prefer a dedicated domain module rather than adding more generic helpers.

## Folder structure guidance

- `utils/tickets.ts` is fine for pure ticket-related helpers, but ticket business rules should live in `domain/tickets.ts` or another domain-specific module if they grow.
- `utils/validation.ts` is acceptable for tiny shared primitives, but once schemas become feature-specific, move them into `validation/` or next to the route/domain they support.
- If ticket and category logic expands, add focused modules like `src/lib/db/categories.ts`, `src/lib/domain/board.ts`, or `src/lib/validation/tickets.ts` instead of overloading one file.
- If ticket IDs come from Prisma/DB-generated IDs, helper modules should not own ID generation.
- Do not put something in `utils/` only because it is reused in many places. Reused domain logic is still domain logic.

## Styling guidance

- Tailwind v4 is configured through CSS-first theming in `src/app/globals.css`.
- Prefer semantic theme tokens over ad hoc arbitrary values when possible.
- Keep global styles simple and readable; avoid clever CSS unless it clearly improves the app.

## Auth guidance

- Use **database-backed sessions in `HttpOnly` cookies**, not JWT-led auth, unless requirements change.
- Cookie contents should store an opaque session identifier, not sensitive user data.
- Logout should invalidate the session in the database and clear the cookie.

## API guidance

- Keep API responses consistent and explicit.
- Validate mutation inputs on the server.
- Use correct HTTP status codes for auth, validation, not found, and server errors.
- Keep Route Handlers thin; push reusable logic into `src/lib`.
