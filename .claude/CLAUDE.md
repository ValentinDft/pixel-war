# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Collaborative 16×16 pixel board. Angular 22 SPA + Supabase (Postgres + Realtime). Players
click a cell to paint it; every client sees the change live. A given pixel can only be
repainted once every 5 seconds — enforced **in the database**, not in the browser.

Requires Node 22 (`.nvmrc`); npm is pinned via `packageManager` in `package.json`.
`@valentindft/ng-base-config` is private (GitHub Package Registry) — installs need an
authenticated `.npmrc`.

## Commands

- `npm start` — dev server at http://localhost:4200 (alias for `ng serve`)
- `npm run build` — production build to `dist/`
- `npm run watch` — dev-configuration build in watch mode
- `npm test` — unit tests in watch mode
- `npm test -- --watch=false` — single headless run (used by pre-push and CI)
- `npm test -- src/app/core/services/pixel-board.service.spec.ts` — single spec file (standard Vitest CLI args pass through)
- `npm run lint` — ESLint over the repo
- `npm run format` — Prettier write across the repo

The `test` architect target uses `@angular/build:unit-test`, which runs **Vitest** under the
hood (not Karma/Jasmine). Test globals come from `vitest/globals` (see `tsconfig.spec.json`);
the DOM environment is `jsdom`. The `test` target declares no options of its own — it inherits
from the `build` target.

## Architecture

```
src/app/
├── core/                    # singletons and non-UI code
│   ├── mocks/               # test doubles (supabase.mock.ts)
│   ├── models/              # domain types (pixel.interface.ts)
│   └── services/            # supabase.service.ts, pixel-board.service.ts
├── features/home/
│   ├── home.ts|html|scss    # composes the components, triggers connect()
│   └── components/<name>/   # header, board, color-selector
│       ├── constants/       # <name>.constant.ts
│       └── interfaces/      # <name>.interface.ts
└── shared/                  # reusable components/directives/pipes (currently empty)
```

Feature-local components live under `features/<feature>/components/<name>/`, each grouping
`<name>.ts` + `.html` + `.scss` + `.spec.ts`, with `interfaces/` and `constants/` subfolders
when needed. Do not put feature components in `shared/` — that is for genuinely cross-feature UI.

Bootstrap flow: `src/main.ts` → `App` (`src/app/app.ts`) → `Home`. `appConfig`
(`app.config.ts`) registers only `provideBrowserGlobalErrorListeners()` and
`provideRouter(routes)`; `app.routes.ts` is empty and no routing is wired.

### Path aliases

Declared in `tsconfig.json`, inherited by `tsconfig.app.json` and `tsconfig.spec.json`:

| Alias         | Target                         |
| ------------- | ------------------------------ |
| `@core/*`     | `src/app/core/*`               |
| `@features/*` | `src/app/features/*`           |
| `@shared/*`   | `src/app/shared/*`             |
| `@env`        | `src/environments/environment` |

Use them for cross-layer imports; keep relative paths for siblings inside the same component folder.

### State flow — read before touching the board

All board state lives in `PixelBoardService` as signals. `Board` and `ColorSelector` are
stateless views over it.

1. `Home.ngOnInit()` calls `connect()`: loads the persisted pixels, then subscribes to the
   realtime channel. Idempotent — the subscription is created once (`this.changes ??= …`).
2. Clicking a cell calls `paint(x, y)`, which invokes the `paint_pixel` RPC.
3. **`paint()` deliberately does not mutate the board.** The color is applied only when the
   realtime event comes back, so the author of the click and every other player follow the
   exact same path. Do not "optimize" this into an optimistic update — it would let a rejected
   pixel (cooldown, network error) appear locally and desync clients.
4. Rejections are translated into a human-readable message in `lastError`, rendered by `Home`
   in a `<p role="status">`.

Realtime teardown is driven by `takeUntilDestroyed(destroyRef)`: the `Observable` wrapping the
channel removes it in its teardown function.

## Backend (Supabase)

**The schema is not versioned in this repo** — migrations live only in the Supabase project.
Inspect it with the Supabase MCP tools or the dashboard rather than guessing.

- **Table `public.pixels`** — one row per cell, PK `(x, y)`. Coordinates are `smallint`
  constrained to `0..15`, `color` is constrained to the 16-color palette, and `updated_at` is
  maintained by a trigger on update. That timestamp is what the cooldown reads.
- **RLS** is on, with a single public-read policy. There is **no insert/update policy** —
  direct writes from the client are impossible by design.
- **`paint_pixel(p_x, p_y, p_color)`** — `SECURITY DEFINER`, pinned `search_path`, the only
  write path. Locks the target row, raises `cooldown` (`errcode = 'P0001'`, `details` =
  remaining seconds) if the cell was painted less than 5 seconds ago, otherwise upserts.
- The cooldown is **per pixel, not per player**. A player can click different cells back to
  back; only repainting the same cell is throttled.
- `pixels` belongs to the `supabase_realtime` publication, which feeds the client subscription.

`PixelBoardService.toMessage()` depends on the `message === 'cooldown'` / `details` contract.
Changing the SQL error shape breaks the UI message silently — update both sides together.

### Environments

`src/environments/environment.ts` (prod) and `environment.development.ts` (swapped in via
`fileReplacements` in the `development` configuration) hold the Supabase URL and key.

The committed key is a **publishable** key, meant to be exposed to the browser; safety comes
from RLS plus the `SECURITY DEFINER` RPC. Never commit a `service_role` key or an `sbp_` PAT
(`.vscode/mcp.json` is gitignored for that reason).

## Project-specific conventions

- **Component / directive selector prefix is `pix`** — enforced by
  `@angular-eslint/{component,directive}-selector` and set as `"prefix": "pix"` in
  `angular.json`. Do NOT use `app-`. When renaming a selector, update every referencing template.
- **File names carry the kind, symbols do not**: `*.interface.ts`, `*.constant.ts`,
  `*.service.ts`, `*.mock.ts`, but the exported symbols stay clean (`Row`, `PALETTE`,
  `PixelRow`). Services are the exception — the class keeps the `Service` suffix
  (`PixelBoardService`) to disambiguate from domain models.
- **No `index.ts` barrels.** Import directly.
- Services use `@Service()` (Angular v22+) and declare members with an explicit `public` modifier.
- SCSS is the style language (`inlineStyleLanguage: scss`, schematic default `style: scss`).
- **Component styles use local SCSS `$` variables**, declared at the top of the file — not CSS
  custom properties. Custom properties only earn their keep when a value must be overridden at
  runtime (theming, zoom), which is not the case today. A typo in a `var()` name fails
  silently; a typo in `$var` fails the build.
- Stylelint enforces modern color notation: `oklch(85% 0.005 90deg)`, not
  `oklch(0.85 0.005 90)`. These are **errors** and will block the pre-commit hook.
- Shared ESLint / Prettier / Stylelint / tsconfig / lint-staged configs come from
  **`@valentindft/ng-base-config`**. Do not fork the rules locally — extend or PR the shared package.
- Extra tsconfig strictness beyond Angular defaults: `noImplicitOverride`,
  `noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch`,
  `exactOptionalPropertyTypes`.
- Notable ESLint rules: `@typescript-eslint/no-floating-promises` (error),
  `consistent-type-imports` (warn — prefer `import type`), `eqeqeq` (error), `no-console` (warn).

### The palette is duplicated on purpose

`PALETTE` in `color-selector.constant.ts` and the `check` constraint on `pixels.color` list the
same 16 hex values. **They must stay in sync** — adding a color to the UI without the matching
migration makes every write with that color fail at runtime.

## Testing

Specs must **never** reach the real Supabase project. `@core/mocks/supabase.mock.ts` exposes
`createSupabaseMock()`, implementing only the surface `PixelBoardService` consumes:

```ts
const mock = createSupabaseMock();
TestBed.configureTestingModule({
  providers: [{ provide: SupabaseService, useValue: mock.service }],
});

mock.state.rows = [{ x: 0, y: 0, color: '#E50000' }]; // initial board fetch
mock.state.rpcError = cooldownError(3); // make paint_pixel fail
mock.state.selectError = …; // make the board fetch fail
mock.state.emit({ x: 1, y: 1, color: '#0000EA' }); // simulate a realtime event
mock.state.rpcCalls; // assert on what was sent
```

Because painting is not optimistic, a spec that clicks a cell and asserts on the board must
either `emit()` the corresponding realtime row or assert on `rpcCalls` instead.

## Hooks & CI

- **Husky pre-commit** runs `lint-staged`: `eslint --fix` + `prettier --write` on TS/HTML,
  `stylelint --fix` + `prettier --write` on SCSS/CSS, `prettier --write` on JSON/MD.
- **Husky pre-push** runs `npm test -- --watch=false`.
- **CI** (`.github/workflows/ci.yml`) runs `npm run lint` and the same headless test command on
  push and PRs to `main`.

## Coding guidance (TypeScript / Angular)

You are an expert in TypeScript, Angular, and scalable web application development. You write
functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

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
- The board is an ARIA grid: `role="grid"` → `role="row"` → `role="gridcell"`, with
  `aria-rowcount` / `aria-colcount` / `aria-rowindex` / `aria-colindex` and a per-cell
  `aria-label` giving the coordinates. Keep that structure intact when editing the template.

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
- Prefer the `@Service` decorator over `@Injectable({ providedIn: 'root' })` for new singleton services (Angular v22+).
- Use the `inject()` function instead of constructor injection.
