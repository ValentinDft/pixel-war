# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Angular 22 SPA scaffolded via Angular CLI. Currently boilerplate — the root `App` component directly imports the `Home` feature; `app.routes.ts` is empty (no routing wired yet).

Requires Node 22 (`.nvmrc`); npm is pinned via `packageManager` in `package.json`.

## Commands

- `npm start` — dev server at http://localhost:4200 (alias for `ng serve`)
- `npm run build` — production build to `dist/`
- `npm run watch` — dev-configuration build in watch mode
- `npm test` — unit tests in watch mode
- `npm test -- --watch=false` — single headless run (used by pre-push and CI)
- `npm test -- src/app/features/home/home.spec.ts` — run a single spec file (standard Vitest CLI args pass through)
- `npm run lint` — ESLint over the repo
- `npm run format` — Prettier write across the repo

The `test` architect target uses `@angular/build:unit-test`, which runs **Vitest** under the hood (not Karma/Jasmine). Test globals come from `vitest/globals` (see `tsconfig.spec.json`); the DOM environment is `jsdom`.

## Architecture

Standard `core / features / shared` layout under `src/app/`:

- `core/` — singleton services, interceptors, guards.
- `features/<name>/` — one folder per feature, each grouping `<name>.ts` + `.html` + `.scss` + `.spec.ts`.
- `shared/` — reusable components, directives, pipes.

Bootstrap flow: `src/main.ts` → `App` (`src/app/app.ts`) configured via `appConfig` (`app.config.ts`), which currently registers only `provideBrowserGlobalErrorListeners()` and `provideRouter(routes)`.

## Project-specific conventions

- **Component / directive selector prefix is `pix`** (enforced by `@angular-eslint/{component,directive}-selector` in `eslint.config.mjs`). Do NOT use `app-`. Trap: `angular.json` still has `"prefix": "app"` and the scaffolded components (`app-root`, `app-home`) currently use `app-`, so `ng generate` would produce a violating selector — override the prefix on the CLI (`ng g c ... --prefix=pix`) or update `angular.json`. When renaming a component's selector, also update every template that references it.
- SCSS is the style language (`inlineStyleLanguage: scss` in `angular.json`, schematic default `style: scss`).
- Shared ESLint / Prettier / Stylelint / tsconfig / lint-staged configs come from **`@valentindft/ng-base-config`** (private, GitHub Package Registry). Do not fork the rules locally — extend or PR the shared package instead.
- Extra tsconfig strictness beyond Angular defaults: `noImplicitOverride`, `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- Notable ESLint rules from the shared config: `@typescript-eslint/no-floating-promises` (error), `consistent-type-imports` (warn — prefer `import type`), `eqeqeq` (error), `no-console` (warn).

## Hooks & CI

- **Husky pre-commit** runs `lint-staged`: `eslint --fix` + `prettier --write` on TS/HTML, `stylelint --fix` + `prettier --write` on SCSS/CSS, `prettier --write` on JSON/MD.
- **Husky pre-push** runs `npm test -- --watch=false --browsers=ChromeHeadless`.
- **CI** (`.github/workflows/ci.yml`) runs `npm run lint` and the same headless test command on push and PRs to `main`.

## Coding guidance (TypeScript / Angular)

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

### TypeScript

- Use strict type checking.
- Prefer type inference when the type is obvious.
- Avoid the `any` type; use `unknown` when type is uncertain.

### Angular

- Always use standalone components over NgModules.
- Must NOT set `standalone: true` inside Angular decorators — it's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly — `OnPush` is the default in Angular v22+.
- Use signals for state management.
- Implement lazy loading for feature routes.
- Do NOT use `@HostBinding` / `@HostListener` decorators — put host bindings inside the `host` object of `@Component` / `@Directive` instead.
- Use `NgOptimizedImage` for all static images (does not work for inline base64 images).

### Accessibility

- Must pass all AXE checks.
- Must follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility.
- Use `input()` and `output()` functions instead of decorators.
- Use `computed()` for derived state.
- Prefer inline templates for small components.
- Prefer Signal Forms (`@angular/forms/signals`) for new forms — stable in Angular v22+, with signal-based state, type-safe field access, and schema-based validation.
- When not using Signal Forms, prefer Reactive forms over Template-driven ones.
- Do NOT use `ngClass` — use `class` bindings.
- Do NOT use `ngStyle` — use `style` bindings.
- When using external templates/styles, use paths relative to the component TS file.

### State management

- Use signals for local component state.
- Use `computed()` for derived state.
- Keep state transformations pure and predictable.
- Do NOT use `mutate` on signals — use `update` or `set`.

### Templates

- Keep templates simple; avoid complex logic.
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`.
- Use the async pipe to handle observables.
- Do not assume globals like `new Date()` are available.

### Services

- Design services around a single responsibility.
- Use `providedIn: 'root'` for singleton services.
- Prefer the `@Service` decorator over `@Injectable({ providedIn: 'root' })` for new singleton services (Angular v22+).
- Use the `inject()` function instead of constructor injection.
