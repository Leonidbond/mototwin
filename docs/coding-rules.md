# MotoTwin Coding Rules

## 1. Purpose

This document defines how code must be written in the MotoTwin project.

These rules apply to:
- human-written code
- AI-generated code
- Cursor-generated code
- refactoring
- API routes
- database logic
- UI components
- utility functions

The goal is to keep the codebase:
- predictable
- maintainable
- readable
- production-oriented
- easy to extend

---

## 2. General Principles

1. Build for clarity first, abstraction second.
2. Prefer simple and explicit code over clever code.
3. Every new file must have a clear purpose.
4. Avoid premature optimization.
5. Avoid unnecessary abstractions.
6. Avoid overengineering.
7. Prefer boring and reliable solutions.
8. Code must be understandable without AI assistance.
9. The project must remain easy to continue manually by a human developer.
10. Every feature must be implemented in small working increments.

---

## 3. Architecture Principles

1. MotoTwin is a service-centered digital garage, not a marketplace.
2. Core product logic has higher priority than UI polish.
3. Structured data is the source of truth.
4. LLM must never be the source of truth for fitment or business-critical logic.
5. The project must remain data-first.
6. Business entities must be modeled clearly in the database.
7. Every new module must fit the MVP scope.
8. Do not build future modules before the current workflow is working.
9. Prefer vertical slices of functionality over disconnected generic layers.
10. Each completed step must produce a working result.

---

## 4. Scope Discipline

When writing code, always respect MVP boundaries.

Allowed:
- landing page
- onboarding
- garage
- vehicle profile
- ride profile
- service log
- reminders
- fitment
- expenses
- freemium foundations

Do not build unless explicitly requested:
- marketplace
- social features
- community
- chat
- telemetry
- hardware integration
- car support
- full VIN decoding
- advanced analytics
- B2B API
- white-label
- gear module

If a requested implementation goes beyond MVP, stop and keep the code within the approved scope.

---

## 5. Code Style

1. Use TypeScript everywhere.
2. Use explicit types where they improve readability.
3. Prefer readable names over short names.
4. Avoid single-letter variable names except trivial loop counters.
5. Use English for code, variables, file names, function names, and database models.
6. UI text may be Russian.
7. Keep functions small.
8. One function should do one thing.
9. Avoid deeply nested logic.
10. Prefer early returns over deeply nested if/else blocks.

Bad:
```ts
if (a) {
  if (b) {
    if (c) {
      ...
    }
  }
}
```

Good:
```ts
if (!a) return;
if (!b) return;
if (!c) return;
```

---

## 6. File Size Rules

1. Do not create huge files without need.
2. Prefer splitting code when a file becomes hard to read.
3. Target size:
   - simple component: up to 150 lines
   - medium component: up to 250 lines
   - route or service: up to 200 lines
4. If a file exceeds 250 to 300 lines, consider splitting it.
5. Do not split too early if it harms readability.

---

## 7. Naming Rules

### Variables
Use descriptive names:
- `selectedBrandId`
- `createVehiclePayload`
- `garageVehicles`

Avoid vague names:
- `data`
- `item`
- `value`
- `obj`

unless the scope is very small and obvious.

### Functions
Use action-oriented names:
- `loadBrands`
- `createVehicle`
- `fetchGarageVehicles`
- `formatUsageType`

### Components
Use PascalCase:
- `GaragePage`
- `VehicleCard`
- `RideProfileForm`

### Files
Use Next.js conventions where needed.
Otherwise use clear names:
- `prisma.ts`
- `vehicle-service.ts`
- `garage-card.tsx`

Do not use unclear file names like:
- `helpers2.ts`
- `utilsNew.ts`
- `temp.ts`

---

## 8. Comments

1. Do not comment obvious code.
2. Use comments only when they explain:
   - business logic
   - non-obvious decisions
   - constraints
   - temporary limitations
3. Prefer self-explanatory code over comments.
4. Remove stale comments.
5. Do not add decorative comments.

Bad:
```ts
// Increment i
i++;
```

Good:
```ts
// Demo user is temporary until real auth is implemented.
```

---

## 9. React and Next.js Rules

1. Prefer server-side architecture where it makes sense.
2. Use client components only when state, effects, or browser APIs are needed.
3. Do not add `"use client"` unless required.
4. Keep page components focused on page behavior.
5. Extract repeated UI blocks into components only after repetition is real.
6. Avoid unnecessary custom hooks early in the project.
7. Use App Router conventions consistently.
8. Do not create complex state management before it is needed.
9. Prefer local component state for local workflows.
10. Keep forms straightforward and explicit.

---

## 10. API Route Rules

1. Every API route must do one clear job.
2. Validate input explicitly.
3. Use Zod for request validation.
4. Return JSON consistently.
5. Return meaningful HTTP status codes.
6. Log server errors in the console.
7. Do not leak internal implementation details in error responses.
8. Keep route handlers thin when business logic grows.
9. If route logic becomes complex, move it to a service layer.
10. Never return HTML from API routes intentionally.

Preferred response shape:
```ts
return NextResponse.json({ vehicle }, { status: 201 });
```

Error shape:
```ts
return NextResponse.json(
  { error: "Failed to create vehicle" },
  { status: 500 }
);
```

---

## 11. Validation Rules

1. All external input must be validated.
2. Use Zod for:
   - POST body
   - query params when needed
   - form payloads sent to API
3. Do not trust client-side validation alone.
4. Always validate on the server.
5. Convert empty strings to `null` where appropriate before saving.

---

## 12. Database Rules

1. Prisma schema is the source of truth for database models.
2. Database model names must reflect business entities clearly.
3. Use proper relations instead of duplicated ad hoc fields.
4. Keep the schema normalized enough for correctness, but not over-modeled.
5. Use migrations for schema changes.
6. Do not change the database manually if the same change should exist in Prisma schema.
7. Seed scripts must be deterministic and re-runnable.
8. Temporary demo data is allowed only if clearly intentional.
9. Avoid hidden magic in persistence logic.
10. Every saved record should have a clear ownership and purpose.

---

## 13. Prisma Rules

1. Use one shared Prisma client setup in `src/lib/prisma.ts`.
2. Do not instantiate Prisma client in many places.
3. Respect Prisma 7 adapter-based setup.
4. Keep queries readable.
5. Use `select` when only part of the object is needed.
6. Use `include` only when related data is actually required.
7. Avoid unnecessary nested writes if a simpler flow is clearer.
8. Always think about whether a query is for:
   - create
   - read
   - update
   - list
   - aggregate

---

## 14. UI Rules

1. UI must be clean, restrained, and product-like.
2. Do not use flashy styles.
3. Do not use random colors.
4. Use spacing and typography to create hierarchy.
5. Prioritize clarity over decoration.
6. Every screen must answer a clear user question.
7. Empty states must be useful.
8. Error states must be understandable.
9. Buttons must say what they do.
10. UI text must be concise and clear.

MotoTwin visual tone:
- serious
- modern
- restrained
- clear
- product-first
- suitable for CEO and power users

---

## 15. UX Rules

1. Every page must have a clear primary action.
2. Forms must be easy to understand.
3. Required fields must be obvious.
4. Loading states must be visible.
5. Success and error states must be visible.
6. Do not hide important workflow state.
7. The user must always understand what happens next.
8. Avoid dead-end screens.
9. Navigation must support the core workflow.
10. Build around the actual motorcycle ownership flow.

---

## 16. Error Handling Rules

1. Every async operation must have error handling.
2. User-facing errors must be understandable.
3. Developer-facing errors may be logged in detail.
4. Never silently swallow errors.
5. Do not expose stack traces to users.
6. Use fallback UI where needed.
7. Prefer explicit failure over hidden broken state.

---

## 17. Refactoring Rules

1. Do not refactor working code without reason.
2. Refactor when it improves:
   - clarity
   - maintainability
   - reuse
   - correctness
3. Refactoring must not change business behavior unintentionally.
4. Keep refactors small.
5. Do not mix heavy refactoring with new feature work unless necessary.
6. After refactor, the application must still run immediately.

---

## 18. Cursor Usage Rules

When Cursor writes code, it must follow these rules:

1. Do not rewrite unrelated files.
2. Do not introduce new libraries without clear need.
3. Do not generate placeholder architecture without implementation value.
4. Do not add abstractions for hypothetical future features.
5. Do not rename working entities without reason.
6. Keep changes local to the requested task.
7. Preserve existing conventions.
8. Prefer small diffs.
9. If something is unclear, keep the implementation conservative.
10. Always optimize for a working MVP, not for theoretical perfection.

---

## 19. What Cursor Must Avoid

Cursor must avoid:
- generic boilerplate architecture with no immediate use
- unnecessary repositories/services/hooks patterns
- fake data when real data already exists
- placeholder methods that are not used
- speculative abstractions
- premature state management libraries
- premature form libraries
- overcomplicated validation layers
- unnecessary custom utilities
- broad rewrites of working code

---

## 20. Preferred Development Order

The project should usually move in this order:

1. database and core entities
2. seed data
3. API routes
4. real form UI
5. persistence
6. read views
7. detail pages
8. service logic
9. fitment logic
10. expenses
11. reminders
12. paywall refinement
13. polish

---

## 21. Definition of Done for Any Step

A step is done only if:
1. the code runs
2. the feature works
3. the main path is testable manually
4. there is no obvious broken state
5. the change is understandable from the code
6. the result fits MVP scope

---

## 22. Rule for Uncertainty

If there is uncertainty:
1. prefer the simpler implementation
2. prefer the more explicit implementation
3. prefer the working implementation
4. prefer the MVP-safe implementation

---

## 23. Rule for Business-Critical Logic

For business-critical logic:
- fitment
- reminders
- service status
- compatibility
- expense calculation

always prefer:
- deterministic logic
- structured data
- explicit rules
- easy debugging

Never rely on vague AI reasoning for source-of-truth behavior.

---

## 24. Final Standard

MotoTwin code must feel like:
- a product being built for real users
- a system that can grow
- a codebase a human can maintain
- a focused MVP, not a hackathon demo

---

## 25. Cross-Platform Parity Rules (Web + Mobile)

MotoTwin has two active clients:
- web client
- mobile client (Expo)

1. Every new user-facing feature must be evaluated for both clients.
2. A user-facing feature is not fully complete if it exists only on one client without explicit documented reason.
3. If parity is intentionally deferred, the deferment must be documented in the task or related docs with a clear follow-up step.
4. Core business workflows must stay functionally aligned across web and mobile whenever practical.
5. Platform-specific UX differences are allowed, but the business result and data outcome must remain aligned.
6. Do not introduce silent workflow divergence between clients.
7. Web and mobile layouts do not need to be pixel-identical, but they must keep consistent:
   - information hierarchy
   - naming and terminology
   - status semantics
   - key interaction outcomes
8. Similar user actions on both clients should lead to similar user understanding of what happened.
9. Backend API contracts are shared product truth for both clients.
10. Do not fork business-critical domain logic silently between client implementations.
11. Prefer shared types, shared helpers, and shared API contracts for business-critical behavior.
12. When business logic is cross-platform, implement it in shared packages where practical.
13. UI components may stay platform-specific, but business meaning and data handling must stay aligned.
14. Every implementation task must explicitly state:
    - web impact
    - mobile impact
    - parity status
15. If a step changes only one client, explicitly identify the next parity step.
16. Avoid cross-platform drift in terminology, statuses, and core flow behavior.
17. Definition of done for user-facing features:
    - both clients support the feature, or
    - a documented parity gap exists with a clear follow-up plan.
