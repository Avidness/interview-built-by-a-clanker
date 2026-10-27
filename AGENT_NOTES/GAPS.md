# Functionality Gaps — Agentic Personas Storefront

_Written 2026-10-27; status updated the same day on `feat/gaps` (all checks green: `just check`, 68 API + 43 web + 15 shared unit tests, 65 e2e). Companion to `BUGS.md`. This file lists things the code **intends** to do (per schemas, DB helpers, README, or UI affordances) but does not actually deliver, plus robustness and security gaps a reviewer would expect in a storefront. None of these are the planted bugs; they are judgement calls about what "working" should mean._

---

## 1. Features that are half-built

### 1.1 Price range filter has no UI
- **Status:** Fixed — `feat/gaps-c-features` `6b408d1`
- **Tests:** e2e `price-filter.spec.ts` (6 tests: min, max, range, clearing, URL sync, fresh load)
- `personaFilterSchema` (shared), `db.personas.search`, `GET /personas`, and the browse route's `validateSearch` all support `minPrice` / `maxPrice`.
- `FilterPanel.tsx` exposes only specialty, tier and sort. The price filter is reachable only by hand-editing the URL.
- Either add min/max inputs to the panel or drop the parameter from the route to avoid dead surface area.

### 1.2 Orders are written but never readable
- **Status:** Fixed — `feat/gaps-c-features` `6b408d1`
- **Tests:** API `orders.routes.test.ts` (4 tests: auth, empty, list, per-user); e2e `orders.spec.ts` (6 tests incl. checkout -> orders -> reload)
- `db.orders.create` and `db.orders.getByUserId` exist; there is no `GET /orders` route and no order-history page.
- The confirmation screen in `checkout.tsx` is React state only; a reload after "Place Order" loses the order id and total.
- Smallest useful version: `GET /orders` + a link from the confirmation page.

### 1.3 Favorite state is invisible on cards
- **Status:** Fixed — `feat/gaps-c-features` `6b408d1`
- **Tests:** e2e `favorite-indicator.spec.ts` (2 tests)
- The heart toggle lives only on the detail page. `PersonaCard` (browse grid, favorites grid) gives no indication a persona is already favorited, and there is no way to favorite from the grid.

### 1.4 Favorites and Browse links disappear on mobile
- **Status:** Fixed — `feat/gaps-b-frontend-ux` `f3f49b7`
- **Tests:** e2e `mobile-nav.spec.ts` (2 tests at 375x667)
- `__root.tsx` wraps the Browse/Favorites links in `hidden sm:flex` with no menu button. Below the `sm` breakpoint, Favorites is reachable only by typing the URL.

### 1.5 Checkout form ignores the signed-in user
- **Status:** Fixed — `feat/gaps-b-frontend-ux` `f3f49b7`
- **Tests:** e2e `checkout.spec.ts › prefills name and email from the signed-in user`
- Name and email start empty although `user.username` and `user.email` are available. Prefilling them (editable) removes a step and avoids the order's `customerEmail` silently diverging from the account.

### 1.6 "Quantity" of a monthly persona subscription
- **Status:** Open — product decision, not code
- Pricing is shown as `/mo`, but the cart sells integer quantities and checkout produces a one-off `total`. There is no subscription, billing period, or payment step. This is fine for a demo, but the UI copy and the data model disagree; worth a product decision before adding anything on top of it.

---

## 2. Validation and error handling

### 2.1 `GET /personas` does not use the shared filter schema
- **Status:** Fixed — `feat/gaps-a-validation` `59d26cb`
- **Tests:** API `personas.routes.test.ts` (5 tests: 400 on `minPrice=abc`, unknown `sort`, unknown `specialty`/`tier`; `minPrice=0` honoured; numeric coercion)
- `routes/personas.ts` hand-parses `request.query`. Unknown `specialty` / `tier` silently return an empty list; unknown `sort` is silently ignored; `minPrice=abc` becomes `NaN` and filters everything out.
- `personaFilterSchema` already does coercion + enum validation; apply it with `safeParse` and return 400 on failure, like every other route.

### 2.2 `POST /favorites` has no schema
- **Status:** Fixed — `feat/gaps-a-validation` `59d26cb`
- **Tests:** API `favorites.routes.test.ts › 400s (not 500s) on a missing, null or non-string body`; shared `addFavoriteSchema`
- The only write route that casts `request.body` instead of validating with Zod. A one-line `z.object({ personaId: z.string() })` in shared would make it consistent.

### 2.3 Frontend swallows API errors
- **Status:** Fixed — `feat/gaps-b-frontend-ux` `f3f49b7`
- **Tests:** e2e `error-states.spec.ts` (5 tests: browse/cart/favorites/detail show the error and retry; 404 still shows not-found)
- `api.ts` throws `ApiError`, but `index.tsx`, `cart.tsx`, `favorites.tsx` and `$personaId.tsx` only branch on `isLoading` / data presence. A failed request renders as "Your cart is empty" / "No personas found" rather than an error. Under BUGS.md B1 this is exactly what a dev sees: the cart 500s and the page claims the cart is empty.
- Add an `isError` branch (or an error boundary on the root route).

### 2.4 Auth loading state is unused
- **Status:** Fixed — as BUGS.md D8 on `fix/web-bugs` `da12a26` (`AuthGate`)
- **Tests:** web `components/AuthGate.test.tsx`
- `AuthProvider` exposes `isLoading`, no consumer reads it (BUGS.md D8). Protected routes should render a skeleton until `/auth/me` resolves.

### 2.5 `validateSearch` does not validate
- **Status:** Fixed — `feat/gaps-a-validation` `59d26cb`
- **Tests:** web `routes/index.validateSearch.test.ts` (3 tests: keeps valid + coerces, drops bad enums/NaN individually, drops empties)
- It casts strings and `Number()`s without checking enums or `NaN`. The shared `personaFilterSchema` could be reused here too, so the URL and the API agree on what is valid.

### 2.6 Search debounce resets on unrelated renders
- **Status:** Fixed — `feat/gaps-b-frontend-ux` `f3f49b7`
- **Tests:** web `test/SearchBar.test.tsx` (3 tests, fake timers); e2e `browse.spec.ts › search debounce is not reset by an unrelated re-render`
- `SearchBar`'s timer effect lists `onChange` as a dependency; `BrowsePage` creates a new `onChange` arrow on every render, so any parent re-render (e.g. the header's cart query settling) restarts the 300 ms timer. Wrap the callback in `useCallback` or drop it from the deps.

---

## 3. Security

### 3.1 Password "hash" is a 32-bit non-cryptographic hash
- **Status:** Open — held until the BUGS fixes to `routes/auth.ts` merged; now unblocked on `feat/gaps`
- `simpleHash` in `routes/auth.ts` is an unsalted djb-style fold into a 32-bit int. Collisions are trivial and it is reversible by brute force in seconds. Even for a demo, use `bcrypt`/`argon2` (or at minimum `crypto.scrypt`).

### 3.2 JWT secret is hardcoded and tokens never expire
- **Status:** Open — same
- `app.ts` registers `@fastify/jwt` with a literal secret and `sign()` is called with no `expiresIn`. Read the secret from env and set an expiry; the client already handles 401 by clearing the token.

### 3.3 Sequential, guessable ids
- **Status:** Open — same
- `user-N`, `cart-N`, `order-N` are counters. Combined with the missing ownership check on cart delete (BUGS.md B6) this makes cross-user tampering a one-liner. `crypto.randomUUID()` is available in Node 20+.

### 3.4 Email uniqueness is case-sensitive
- **Status:** Open — same (FINDINGS L11)
- `db.users.getByEmail` does an exact match; `Alice@x.com` and `alice@x.com` are two accounts. Normalise to lower-case on register and login.

### 3.5 No rate limiting on `/auth/login`
- **Status:** Open — needs a dependency decision (`@fastify/rate-limit`)
- With the weak hash above, unlimited login attempts make credential guessing cheap. `@fastify/rate-limit` on the auth routes is a small addition.

---

## 4. Persistence and operations

- **Status:** `turbo dev` now depends on `^build` and the README documents in-memory state (`feat/gaps-d-tooling` `c295ef4`). The stale-`dist` note is moot once `dev` builds shared first.

- **Everything is in memory.** Users, carts, favorites and orders vanish on restart; `tsx watch` restarts on every save, so dev sessions lose state constantly. Acceptable for the assessment, but the README should say so.
- **`turbo dev` does not build `@acme/shared` first.** Both apps import `@acme/shared` from `dist/`. The README works around it with `pnpm build` before `pnpm dev`; a `dependsOn: ["^build"]` on `dev`, or pointing the shared `exports` at `src` for dev, would remove the footgun.
- **Stale `apps/api/dist`.** It predates `app.ts`; `pnpm start` will fail until `pnpm build` runs again. Not a bug, just a trap.

---

## 5. Tooling and test coverage

- **Status:** Biome lint wired into `turbo lint` and `just check` (`7a6a862`, lint clean after `ac7c806`); Vitest for `apps/web` and `packages/shared` (`8278947` plus the web unit tests from `fix/web-bugs`); B1 regression test `apps/api/test/auth.default-config.test.ts` (`868ad27`), now passing; `just test` runs unit suites only, Playwright stays in `just e2e` (`281d1cc`). Decision: Jest stays for the API, Playwright for e2e, Vitest for web/shared. Still open: the Jest `@acme/shared` -> `src` mapping versus the app reading `dist`.

- **No lint.** Root `lint` script runs `turbo lint`, but no workspace defines a `lint` script and there is no Biome/ESLint config. `pnpm lint` is a silent no-op.
- **No tests for `packages/shared` or `apps/web`.** Schemas are exercised indirectly via API tests; React components and hooks (SearchBar debounce, StarRating, auth context) have none. `vitest` + Testing Library would fit the existing Vite setup.
- **API tests use Jest, not Vitest.** Works, but it is a second test runner in a Vite monorepo. Worth aligning when web tests are added.
- **B1 is untested.** Both suites force `ENFORCE_AUTH=true`, so the default-config crash in `middleware/auth.ts` has no automated coverage. After fixing B1 (always enforce), delete the flag so this cannot regress.
- **Jest reads `@acme/shared` from `src` while the app reads from `dist`.** `jest.config.js` maps the package to `packages/shared/src/index.ts`; if `dist` is stale, tests and the running server can disagree about schema behaviour.

---

## 6. Remaining work

1. 3.1–3.4 auth hardening (one agent on `feat/gaps`; files are no longer contended).
2. 3.5 rate limiting, if `@fastify/rate-limit` is approved.
3. 1.6 product decision on pricing copy versus data model.

_Original suggested order, kept for reference:_

1. 2.1, 2.2, 2.5 — reuse the shared schemas (small, high consistency payoff).
2. 2.3, 2.4 — error and loading states (what a user sees when something goes wrong).
3. 3.1–3.4 — auth hardening (each is < 20 lines).
4. 1.1, 1.2 — finish the two features that already have backend support.
5. 5 — lint + web unit tests so `just check` means something for the frontend.
