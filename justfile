# Common tasks. Run `just` to list them.

default:
    @just --list

install:
    pnpm install

build:
    pnpm build

dev:
    pnpm dev

typecheck:
    pnpm typecheck

# Unit tests: API (Jest) and web (Vitest)
test:
    pnpm --filter @acme/api test
    pnpm --filter @acme/web test

# Browser end-to-end tests (Playwright)
e2e:
    pnpm --filter @acme/e2e test

# Everything that must pass before a change is done
check: typecheck test
