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

# Lint and format check (Biome) across every workspace
lint:
    pnpm lint

# Unit tests: API (Jest), web and shared (Vitest), via turbo
test:
    pnpm test

# Browser end-to-end tests (Playwright)
e2e:
    pnpm --filter @acme/e2e test

# Everything that must pass before a change is done
check: lint typecheck test
