# Taskflow

This document explains not just **what** I built, but **why** I built it this way for a take-home assessment.

The short version: I optimized for correctness, clarity, and maintainable architecture under time constraints, while deliberately leaving room for production-grade enhancements.

## 1) Project intent

Taskflow is a Trello-style kanban board built with:

- Next.js 16 App Router
- TypeScript
- Tailwind CSS v4
- Prisma + PostgreSQL
- Database-backed session authentication

The assignment was implemented end-to-end with authenticated board access, category/ticket management, drag-and-drop, expiry status, and ticket history visibility.

## 2) What is implemented

### Authentication and access control

- Register, login, logout flows
- Protected `/board` route for authenticated users
- Guest-only auth pages (`/login`, `/register`)
- Session cookie with an opaque session id + HMAC signature

### Board functionality

- Create categories
- Reorder categories (left/right controls)
- Delete categories (only when empty)
- Create, edit, delete tickets
- Move tickets within and across categories using drag-and-drop
- Optimistic client updates for moves with server reconciliation

### Product behavior details

- Unsaved ticket description draft is restored when reopening the same ticket
- Hard refresh clears that draft (as required)
- Expiry states:
  - `On Track`
  - `Due Soon` (within 48h window)
  - `Overdue`
- Recent ticket history shown in edit drawer (latest 10 entries)

### Validation and error handling

- Runtime validation via Zod for auth/category/ticket mutation payloads
- Consistent API error shape with code/message and optional form/field errors
- Field-level errors rendered in forms

### Testing

- Unit tests for pure business logic:
  - ticket DnD normalization/move logic
  - category ordering logic
  - expiry-state calculation
  - date formatting utilities

## 3) Architecture decisions and rationale

## Decision A: Server Components by default, Client Components where interaction is real

**What I chose**
- Server-side auth + data loading in `src/app/(board)/board/page.tsx`
- Interactive board logic in client component `src/app/(board)/_components/board-columns.tsx`

**Why**
- Keeps sensitive auth/data checks server-side
- Limits client-side complexity to interaction concerns (drag, modals, local draft state)
- Matches App Router’s intended model

**Trade-off**
- Requires explicit server→client data handoff and refresh patterns

---

## Decision B: Route Handlers for mutations instead of Server Actions

**What I chose**
- `src/app/api/**` Route Handlers for auth, categories, tickets, and moves

**Why**
- Explicit API contracts are easy to reason about and test
- Clean separation of domain logic and transport layer
- Predictable for future integration (mobile/web clients, external consumers)

**Trade-off**
- More boilerplate than direct Server Actions
- More manual fetch/error plumbing in client components

---

## Decision C: Stateful DB sessions with signed opaque cookie (not JWT)

**What I chose**
- Session rows in DB (`Session` model)
- Cookie stores `sessionId.signature` (HMAC SHA-256 signature)

**Why**
- Immediate server-side invalidation on logout
- Simpler revocation story than stateless JWT in this scope
- Security posture is straightforward for a take-home app

**Trade-off**
- DB lookup required for session resolution
- Session `lastSeenAt` exists but sliding-session refresh is not implemented yet

---

## Decision D: Native HTML5 drag-and-drop + pure move logic utilities

**What I chose**
- Browser-native `draggable` behavior
- Reorder/move logic in pure helper modules under `src/lib/board/`

**Why**
- Matches requirement and delivers required behavior quickly without framework lock-in

**Trade-off**
- Limited touch and keyboard accessibility vs specialized libraries
- More manual edge-case handling

---

## Decision E: Integer order fields for categories and tickets

**What I chose**
- `order: Int` persisted on both categories and tickets
- Recompute/swap order indices transactionally during moves

**Why**
- Simple and explicit ordering model
- Easy to debug and verify in DB
- Appropriate for single-user/small-scale take-home scope

**Trade-off**
- Reorders may update multiple rows ("write heavy")
- For the expected data volume this acceptable however, not ideal for high-frequency concurrent collaboration at scale

---

## Decision F: In-memory draft persistence for ticket description edits

**What I chose**
- Local `useState<Record<string, string>>` keyed by ticket id

**Why**
- Exactly matches requirement: draft survives ticket switching, but not hard refresh
- Zero persistence/storage complexity

**Trade-off**
- Drafts are per-tab and short-lived by design
- No recovery after reload/browser close

## 4) Feature trade-offs (minimal version vs advanced version)

This project intentionally implements reliable “minimal viable architecture” paths while preserving clean upgrade routes.

### Data synchronization after mutations

- **Current:** optimistic local updates + `router.refresh()` reconciliation
- **Advanced:** TanStack Query with mutation cache updates and background refetch
- **Why current won:** lower complexity, easier correctness under deadline

### Drag-and-drop UX

- **Current:** native desktop-centric DnD
- **Advanced:** `@dnd-kit` with touch sensors, keyboard DnD, richer a11y
- **Why current won:** no dependency overhead, required behavior delivered

### Ordering strategy

- **Current:** integer order with transactional reindexing
- **Advanced:** Strategies that minimize write operations during reordering
- **Why current won:** deterministic and clear for this assessment scale

### Session model

- **Current:** DB-backed sessions via signed cookie
- **Advanced:** Redis-backed session store for faster lookups and TTL handling
- **Why current won:** simpler operational footprint and clear revocation

### Test stack

- **Current:** Node’s built-in test runner (`node:test`) for core logic
- **Advanced:** Vitest/Jest + React Testing Library + Playwright E2E
- **Why current won:** prioritize core correctness while keeping toolchain light

## 5) Known limitations (intentional and non-intentional)

This section is intentionally candid.

### UX and interaction

- DnD is desktop-first and not fully touch-optimized
- Keyboard-accessible drag workflow is limited
- No undo/redo for destructive actions

### Data and API

- No dedicated paginated ticket-history endpoint; board load includes latest 10 history entries per ticket
- No real-time updates across sessions/tabs
- Ticket deletion does not persist a separate long-lived “deleted” history artifact because ticket/history rows are cascade-related

### Security hardening

- No rate limiting on auth/mutation endpoints
- No dedicated CSRF token/origin enforcement beyond SameSite cookie behavior
- No CSP/security headers strategy documented/implemented yet

### Session lifecycle

- Session expiry is fixed window
- `lastSeenAt` exists but is not currently used to extend/rotate sessions

### Quality and observability

- No component integration tests
- No E2E automation for critical user journeys
- No structured app-level telemetry (metrics/traces)

## 6) Why these trade-offs are reasonable for a take-home

For this submission, I prioritized:

1. **Correctness over cleverness** — strict validation, server-side auth checks, transactional DB mutations.
2. **Readable architecture over abstraction-heavy patterns** — explicit route handlers and focused `src/lib` modules.
3. **Demonstrable thinking over feature inflation** — each minimal choice has a clear, incremental upgrade path.

## 7) How to run locally

```bash
npm install
cp .env.example .env
```

Set values in `.env`:

- `DATABASE_URL`
- `SESSION_SECRET`

Then run:

```bash
npm run db:generate
npm run db:migrate
npm run dev
```

Open `http://localhost:3000`.

Create an account through `/register`, then sign in and use `/board`.

Useful verification commands:

```bash
npm run test
npm run lint
npm run build
```

## 8) Reviewer guide (where to look in code)

- Auth/session flow:
  - `src/lib/auth/session.ts`
  - `src/app/api/auth/login/route.ts`
  - `src/app/api/auth/logout/route.ts`
  - `src/lib/auth/guards.ts`
- Board data loading and client interaction:
  - `src/app/(board)/board/page.tsx`
  - `src/app/(board)/_components/board-columns.tsx`
- Data/domain modules:
  - `src/lib/db/categories.ts`
  - `src/lib/db/tickets.ts`
  - `src/lib/board/ticket-dnd.ts`
  - `src/lib/board/category-order.ts`
- Validation:
  - `src/lib/validation/*.ts`
- Schema:
  - `prisma/schema.prisma`
