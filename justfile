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

# API unit tests (Jest)
test:
    pnpm --filter @acme/api test

# Browser end-to-end tests (Playwright)
e2e:
    pnpm --filter @acme/e2e test

# Everything that must pass before a change is done
check: typecheck test
