# Findings report: Agentic Personas Storefront

## Summary
The app builds, but the main flows are broken end to end: with the default config every cart, favorites, checkout and `/auth/me` request returns 500 because the auth middleware never populates `request.user`. Behind that, checkout never empties the cart, any user can delete another user's cart item, the browse page shows prices 100x too high, and search/filter/sort never refetch. There is no test suite, so nothing here would have been caught automatically; `pnpm typecheck` also fails.

| | Critical | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Broken | 1 | 3 | 1 | 0 | 5 |
| Logic issues | 3 | 5 | 5 | 6 | 19 |
| Gaps (intended, not built) | 0 | 0 | 2 | 6 | 8 |
| Coverage gaps | 0 | 2 | 3 | 0 | 5 |

`FINDINGS.md` now consolidates this session's results with `AGENT_NOTES/BUGS.md` and `AGENT_NOTES/GAPS.md`; every row carries a **Ref** back to those note ids. The uncommitted Jest and Playwright suites in the working tree fail on the same bugs (API 7 of 50, e2e 16 of 42), which is independent confirmation of L1, L2, L5, L7, B2, L3, L4, L6, L8, L9 and L13.

## Top findings

| # | Kind | Finding | Severity | Impact | Evidence | Suggested fix |
|---|---|---|---|---|---|---|
| B1 | Broken | Auth middleware skips `jwtVerify` when `ENFORCE_AUTH` is unset, so `request.user` is null and all user routes 500 | Critical | Cart, favorites, checkout and session restore unusable | `curl localhost:3001/cart -H "Authorization: Bearer <token>"` -> 500 "Cannot destructure property 'id' of 'request.user'" | Always try `jwtVerify`; return 401 when no user |
| L1 | Logic | `DELETE /cart/:itemId` has no ownership check | Critical | Any user can empty another user's cart (ids are `cart-N`) | Harness with auth on: Bob's DELETE on Alice's item -> 200, Alice's cart empty; Bob's PUT -> 404 | Copy the PUT guard |
| L2 | Logic | Checkout never clears the cart | Critical | Duplicate orders; cart persists after purchase | Two `POST /checkout` both 201; `GET /cart` still 99.98 | Call `db.cart.clearForUser` |
| L3 | Logic | Card price multiplied by 100 | Critical | Browse page shows `$4999.00` for a `$49.99` persona | `PersonaCard.tsx:63` vs detail page and seed data | Drop the `* 100` |
| B2 | Broken | CORS omits DELETE | High | Remove-from-cart and unfavorite blocked in the browser | Preflight returns `allow-methods: GET, POST, PUT, OPTIONS` | Add DELETE |
| L4 | Logic | Persona list query key ignores filters | High | Search/filter/sort change the URL but not the grid | `index.tsx:43` `queryKey: ["personas"]`, staleTime 60 s | Include `search` in the key |
| L5 | Logic | `minPrice` uses `<=` | High | Filter returns the cheap personas instead of the expensive ones | `?minPrice=80` returns 13 items at or below 80 | Use `>=` |
| L6 | Logic | Favorite toggle inverted | High | Heart click sends DELETE first -> 404, never favorites | `$personaId.tsx:42` | Swap branches |
| L7 | Logic | Login omits `username` | High | Blank name in navbar after sign-in | Login body `{"user":{"id","email"}}`; register includes `username` | Return `AuthResponse` |
| L8 | Logic | Sign out leaves token in localStorage | High | Reload restores the session | `auth.tsx:55-58` | Remove the item |
| B5 | Broken | `["favorites"]` query key cached with two different shapes | High | Favorites page empty or detail page crashes depending on order of visits | `favorites.tsx:17` vs `$personaId.tsx:23` | Distinct keys |
| B3 | Broken | `pnpm typecheck` fails | High | Type errors do not block builds | TS4023 on unexported `SearchParams` | Export the interface |

Full list with triggers and evidence: `FINDINGS.md`.

## Test health
- Suite: none exists; 0 tests.
- Coverage: not measurable.
- Build: `pnpm build` passes; `pnpm typecheck` fails with one error.
- Biggest gaps: API route behaviour (auth, ownership, checkout, filters) and frontend query-key correctness have no automated check at all.

## What was checked
- Wide sweep: the repo is small (~2,700 source lines), so I read every source file myself and ran install, build and typecheck. `recon`, `test-runner` and `static-scanner` were not needed (no tests, no linter configured).
- Deep dive: `bug-hunter` (Opus) on the API auth/cart/checkout/favorites flow, including a throwaway Fastify harness with `ENFORCE_AUTH=true` at `/private/tmp/claude-501/-Users-ness-projects-interview-built-by-a-clanker/53cd5b31-839d-4f4e-9be0-2f21e4d467db/scratchpad/harness.mts`. I re-ran it to confirm L1 and L2.
- Found clean: PUT cart ownership, server-side totals and rounding, hook scoping, sort comparators, maxPrice/specialty/tier filters, SearchBar debounce.
- Browser end-to-end: `e2e-tester` (Sonnet, Playwright) walked browse, register/login/logout, detail, cart, favorites, checkout and reload on http://localhost:5173. It confirmed B1, B2, L3, L4, L6, L7 and L8 by running. Cart editing, removal and checkout could not be reached from the UI because B1 returns 500 on every cart request, so L1, L2 and L13 rest on curl and the auth-enforced harness. (The first attempt was blocked by a stale Vite server from another project on port 5173; it was stopped at the user's request.)
- No test-auditor: nothing is committed to audit. The working-tree suites were reviewed by reading: their one blind spot is B1 (both force `ENFORCE_AUTH=true`).

## Recommended next steps
1. Fix B1 (auth middleware) first; nothing user-scoped can be exercised until it works. Decide whether no-auth mode should exist at all.
2. Fix L1 (cart IDOR) and L2 (clear cart on checkout), and add `app.inject` route tests for both.
3. Fix the frontend data bugs: L3 price, L4 query key, L6 favorite toggle, B5 key collision, L8 logout, L9 badge key.
4. Fix B2 (CORS DELETE), L5 (minPrice), L7 (login shape), B3 (export `SearchParams`), and wire `personaFilterSchema` and a favorites body schema (L10, B4).
5. Commit the working-tree test suites, add a test for B1 with the flag unset, add a lint config, and run `typecheck` in CI so B3-class errors block merges.
6. After fixing B1, rerun the browser e2e pass to exercise cart editing, removal and checkout from the UI.
