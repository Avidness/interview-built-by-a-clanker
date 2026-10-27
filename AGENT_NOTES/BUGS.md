# Bug Inventory — Agentic Personas Storefront

_Written 2026-10-27 from a full read of `apps/api`, `apps/web`, `packages/shared`, plus a run of the API Jest suite and the web typecheck._

Status legend:
- **Confirmed (test)** — a test in `apps/api/test` or `apps/e2e/tests` currently fails on it.
- **Confirmed (build)** — reproduced by `pnpm typecheck`.
- **Confirmed (read)** — unambiguous from the source; no automated test covers it yet.

**Resolution (2026-10-27):** every item below is fixed and merged into `merge/consolidated`. Each entry's **Fixed** line names the branch and commit.

| Check | Original baseline | On `merge/consolidated` |
|---|---|---|
| `just typecheck` | `@acme/web` fails (1 error) | passes |
| `just test` (API, Jest) | 7 failed / 43 passed | 56 passed / 56 |
| `pnpm --filter @acme/web test` (Vitest) | no suite | 32 passed / 32 |
| `just e2e` (Playwright) | 16 failed / 26 passed | 42 passed / 42 |
| `just check` | fails | passes |

---

## A. Build / tooling

### A1. Web typecheck fails: `SearchParams` not exported
- **File:** `apps/web/src/routes/index.tsx:9`
- **Status:** Confirmed (build)
- **Fixed:** branch `fix/bugs-a-c`, commit `f676cb3`
- `interface SearchParams` is used in `validateSearch`'s return type but is not exported. The generated `routeTree.gen.ts` re-exports `IndexRoute`, so TypeScript emits `TS4023: Exported variable 'IndexRoute' has or is using name 'SearchParams' ... but cannot be named`.
- **Fix:** `export interface SearchParams`.

---

## B. Backend (`apps/api`)

### B1. Auth is disabled by default and protected routes crash with 500
- **File:** `apps/api/src/middleware/auth.ts:3-12`
- **Status:** Confirmed (read)
- **Fixed:** branch `fix/bugs-a-c`, commit `48639aa`
- `ENFORCE_AUTH` defaults to `false`, so `authenticate` returns before calling `request.jwtVerify()`. Every protected handler then does `const { id: userId } = request.user as { id: string }` on an unset `request.user` and throws a TypeError → HTTP 500 for `/cart`, `/favorites`, `/checkout`, `/auth/me`.
- The README's `pnpm dev` does not set the env var, so the app as shipped has no working cart, favorites, or checkout. The new Jest `setup-env.ts` and the Playwright config both force `ENFORCE_AUTH=true`, which masks this in tests.
- **Fix:** always verify the JWT (drop the flag, or invert it to an explicit opt-out for local debugging).

### B2. `minPrice` filter is an upper bound
- **File:** `apps/api/src/db.ts` (`db.personas.search`, the `minPrice` branch)
- **Status:** Confirmed (test) — `db.test.ts` ×2, `personas.routes.test.ts` ×1
- **Fixed:** branch `fix/bugs-a-c`, commit `4a34145`
- Uses `p.price <= filters.minPrice`; should be `>=`.

### B3. CORS does not allow `DELETE`
- **File:** `apps/api/src/app.ts:21` (was `index.ts` at HEAD)
- **Status:** Confirmed (test) — `cart.routes.test.ts › allows the browser to preflight DELETE`; e2e `cart › removes an item from the cart`, `favorites › removes a favorite from the favorites page`
- **Fixed:** branch `fix/bugs-a-c`, commit `f63d0bb`
- `methods: ["GET", "POST", "PUT", "OPTIONS"]`. The browser preflight for removing a cart item or a favorite fails, so those UI actions never reach the server.
- **Fix:** add `"DELETE"` (or drop the `methods` override and use the default).

### B4. Login response omits `username`
- **File:** `apps/api/src/routes/auth.ts:60-64`
- **Status:** Confirmed (test) — `auth.routes.test.ts › returns a token and the same public user shape as register`
- **Fixed:** branch `fix/bugs-a-c`, commit `e32ede4`
- Register returns `{ id, username, email }`; login returns `{ id, email }`. The `response` object is not annotated as `AuthResponse`, so TypeScript does not catch it. The nav bar renders `user.username` → blank after login until a reload re-fetches `/auth/me`.
- **Fix:** include `username`, and type the local as `AuthResponse`.

### B5. Checkout never clears the cart
- **File:** `apps/api/src/routes/checkout.ts`
- **Status:** Confirmed (test) — `checkout.routes.test.ts › creates an order ... then empties the cart`; e2e `checkout › empties the cart after a successful order`
- **Fixed:** branch `fix/bugs-a-c`, commit `f50bafa`
- `db.cart.clearForUser(userId)` exists in `db.ts` but is never called. After placing an order the cart still holds the items, so a second checkout double-charges.
- Also bypasses `db.cart.getByUserId` and re-implements `enrichCartItems` from `cart.ts`; worth deduplicating when fixing.

### B6. `DELETE /cart/:itemId` has no ownership check (IDOR)
- **File:** `apps/api/src/routes/cart.ts` (delete handler)
- **Status:** Confirmed (test) — `cart.routes.test.ts › keeps carts isolated between users`
- **Fixed:** branch `fix/bugs-a-c`, commit `3b366e9`
- `PUT /cart/:itemId` checks `item.userId !== userId`; `DELETE` only checks existence. Any authenticated user can delete any other user's cart line by guessing `cart-N` ids (which are sequential).

---

## C. Shared (`packages/shared`)

No defects found in the schemas themselves. Two gaps, both now closed:

- `personaFilterSchema` was exported but **unused**; `routes/personas.ts` hand-parsed the query string and accepted any string for `specialty` / `tier` / `sort`, and `minPrice=abc` became `NaN`.
  **Fixed:** branch `fix/bugs-a-c`, commit `2c47f01` — the route now `safeParse`s the query with the shared schema and returns 400 like every other route. New cases in `personas.routes.test.ts`.
- `AuthResponse` was not applied on the login route (see B4), which is how the shape drift slipped through. Fixed with B4.

---

## D. Frontend (`apps/web`)

### D1. Browse page never refetches when filters change
- **File:** `apps/web/src/routes/index.tsx:42-48`
- **Status:** Confirmed (test) — e2e `browse › filters by specialty / by tier / searches by keyword / sorts by price / sorts by name / empty state / clearing a filter` (7 tests)
- **Fixed:** branch `fix/web-bugs`, commit `40f7d24`
- `queryKey: ["personas"]` ignores the search params, while `queryFn` closes over them. With `staleTime: 60s` in `queryClient.ts`, changing specialty, tier, sort or the search box updates the URL but keeps showing the first result set.
- **Fix:** `queryKey: ["personas", search]` (and consider `placeholderData: keepPreviousData` so the grid does not flash).

### D2. Card price is 100× too high
- **File:** `apps/web/src/components/PersonaCard.tsx` (price line)
- **Status:** Confirmed (test) — e2e `browse › lists every seeded persona with name, tier and price`
- **Fixed:** branch `fix/web-bugs`, commit `7ef1e88`
- `${(persona.price * 100).toFixed(2)}` renders `$4999.00/mo` for a $49.99 persona. The detail page and cart render the correct value, so the catalog disagrees with the checkout total.

### D3. Favorite toggle is inverted on the detail page
- **File:** `apps/web/src/routes/personas/$personaId.tsx` (`toggleFavorite` mutation)
- **Status:** Confirmed (test) — e2e `favorites › favorites a persona from its detail page`, `un-favorites a persona from its detail page`
- **Fixed:** branch `fix/web-bugs`, commit `8a3353f`
- `!isFavorited ? api.delete(...) : api.post(...)`. Clicking the heart on an un-favorited persona sends `DELETE` (404 "Favorite not found"); clicking on a favorited one re-POSTs it. Favorites can only be removed from the Favorites page.

### D4. Logout does not clear the stored token
- **File:** `apps/web/src/lib/auth.tsx` (`logout`)
- **Status:** Confirmed (test) — e2e `auth › stays signed out after sign out and reload`
- **Fixed:** branch `fix/web-bugs`, commit `81df69a`
- `login` writes `localStorage.auth_token`; `logout` only resets React state. A reload after "Sign out" silently logs the user back in.

### D5. Nav cart badge goes stale
- **Files:** `apps/web/src/routes/__root.tsx:16` vs. `personas/$personaId.tsx`, `cart.tsx`, `checkout.tsx`
- **Status:** Confirmed (test) — e2e `cart › updates the nav cart badge after adding to cart`
- **Fixed:** branch `fix/web-bugs`, commit `51a15af`
- The header fetches the cart under `queryKey: ["cart-count"]`; every mutation invalidates only `["cart"]`. Adding, changing quantity, removing, or checking out leaves the badge at its old number (60 s stale time).
- **Fix:** use the same key `["cart"]` everywhere (one query, one cache entry).

### D6. Cart "-" button can submit quantity 0
- **File:** `apps/web/src/components/CartItem.tsx` (decrement button)
- **Status:** Confirmed (test) — e2e `cart › cannot decrement below a quantity of one`
- **Fixed:** branch `fix/web-bugs`, commit `2ca57bd`
- The button carries `disabled:opacity-30` styling but no `disabled` attribute. At quantity 1 it sends `PUT /cart/:id {quantity: 0}`, which `updateCartItemSchema` rejects with 400; the UI shows nothing and the item stays.
- **Fix:** `disabled={item.quantity <= 1}` (or treat 0 as remove).

### D7. Favorites query fires for guests on the detail page
- **File:** `apps/web/src/routes/personas/$personaId.tsx` (`favorites` query)
- **Status:** Confirmed (read)
- **Fixed:** branch `fix/web-bugs`, commit `74e7342`
- No `enabled: !!user`, unlike every other authed query. Guests trigger a `401` (or a 500 under B1) on every persona view. Harmless to the UI but noisy and wasteful.

### D8. Protected pages flash the "Sign in" state on reload
- **Files:** `cart.tsx`, `checkout.tsx`, `favorites.tsx`
- **Status:** Confirmed (read)
- **Fixed:** branch `fix/web-bugs`, commit `da12a26`
- `AuthProvider` exposes `isLoading` while `/auth/me` resolves, but no route reads it. On a hard reload of `/cart` with a valid token the page briefly renders "Sign in to view your cart" before switching to the cart.

### D9. Duplicate SVG gradient id in `StarRating`
- **File:** `apps/web/src/components/StarRating.tsx`
- **Status:** Confirmed (read), cosmetic
- **Fixed:** branch `fix/web-bugs`, commit `dcff20e`
- Every partial star defines `<linearGradient id="half">`. With 15 cards on the browse page, all partial stars resolve `url(#half)` to the first gradient in the DOM, so e.g. a 4.4 and a 4.9 rating show the same fractional fill.

---

### D10. Web fetch wrapper sends `Content-Type: application/json` on body-less requests, so every DELETE gets 400
- **File:** `apps/web/src/lib/api.ts` (`request()`, the `headers` object)
- **Status:** Confirmed (test) — found 2026-10-27 while verifying B3 on `fix/bugs-a-c`: Playwright trace shows `DELETE /cart/cart-1 -> 400` after the CORS fix. e2e `cart › removes an item from the cart` and `favorites › removes a favorite from the favorites page` stay red until this is fixed.
- **Fixed:** branch `fix/d10-delete-content-type`, commit `322093d`
- The wrapper always sets `Content-Type: application/json`. `api.delete()` sends no body, and Fastify's JSON parser rejects an empty body with that content type (`FST_ERR_CTP_EMPTY_JSON_BODY`, HTTP 400). B3 (CORS) was masking this: the preflight failed before the request was ever sent.
- **Fix:** only set `Content-Type` when `options.body` is present. (Server-side alternative: a custom `application/json` parser that treats an empty body as `undefined`, but the client is the one at fault.)
- Not in section B because the API behaves correctly; it is the client that lies about its payload.

---

## E. Test baseline on branch `test/api-unit-and-e2e`

Committed 2026-10-27 on `test/api-unit-and-e2e` (pushed to origin). Nothing in this change set fixes a bug; it only adds the harness that proves them.

| Command | What it runs | Result at baseline |
|---|---|---|
| `just test` | API unit tests, Jest via Fastify `inject()` (`apps/api/test`) | 7 failed / 43 passed |
| `just e2e` | Playwright against an isolated API (:3101) + web (:5273) (`apps/e2e/tests`) | 16 failed / 26 passed |
| `just typecheck` | `turbo typecheck` | `@acme/web` fails on A1 |
| `just check` | typecheck + `just test` | fails until A1 is fixed |

Supporting changes in the same commit:

- `apps/api/src/app.ts` — server construction extracted to `buildApp()` so Jest can `inject()` without listening; `index.ts` now only boots it. Reads `PORT` and `WEB_ORIGIN` from env.
- `apps/api/test/*` + `jest.config.js` + `tsconfig.test.json` — 50 API tests written against the *intended* behaviour; the 7 failures map to B2–B6 above. `setup-env.ts` forces `ENFORCE_AUTH=true`, so B1 is not exercised.
- `apps/e2e/*` — Playwright suite (42 tests). Its config also sets `ENFORCE_AUTH=true`. 16 failures are all accounted for by B3, B5, D1–D6.
- `apps/web/src/lib/api.ts` — `API_BASE` honours `VITE_API_URL` so the e2e web server can point at the isolated API.
- `justfile`, root `package.json` (`test`, `test:e2e`), `turbo.json` (`test` task).

After fixes (verified on `merge/consolidated`): both suites green, and `just check` passes.

---

## F. Suggested fix order

All done, in this order:

1. ~~A1~~, ~~B1~~, ~~B2–B6~~, ~~C~~ — `fix/bugs-a-c` (API suite 56/56, `just check` green).
2. ~~D1–D9~~ — `fix/web-bugs`, which also added the Vitest harness (`c645c6d`).
3. ~~D10~~ — `fix/d10-delete-content-type`; the last three e2e failures (cart remove, un-favorite, remove favorite) were this one bug.

Merged into `merge/consolidated` on 2026-10-27: all four checks above green.

See `GAPS.md` in this folder for functionality that is intended by the schemas/UI but not implemented.
