# Fall Hack-a-Thon 2026: Matter.js Simulations

Eight interactive Matter.js sandboxes plus a home grid. Vite + vanilla JS, `matter-js@0.20.0` (pinned).

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (relative base: works on GitHub Pages or Netlify)
```

Routes: `#/` (home) and `#/challenge/<slug>`.

## Working on a challenge

1. Touch **only** `src/challenges/0X-<slug>/`. Its `index.js` is already a copy of `_template/index.js`.
2. Keep `slug` matching `registry.js`. Fill in `title`, `about`, `apis`, `setup(ctx)`, `thumb.svg` and `README.md`.
3. Use colors only via `ctx.theme` (`theme.slate`, `theme.body('accent')`, `theme.constraint()`, …).
4. Never call `addEventListener` / `Events.on` directly. Use `ctx.listen` / `ctx.on` so the shell can clean up.
5. Need a shared helper? Open an issue for the shell owner and write a local version in your folder meanwhile (`// TODO(shell)`).

## `ctx` quick reference

| Field | Notes |
|---|---|
| `Matter`, `engine`, `world`, `render`, `runner` | Created and running. Gravity `{x: 0, y: 1}`. |
| `canvas`, `width`, `height` | `width`/`height` are live getters (CSS px). |
| `theme`, `controls`, `helpers` | See below. |
| `onCleanup(fn)`, `on(target, name, fn)`, `listen(el, type, fn, opts)` | Auto-removed on unmount. |
| `onResize(fn)` | `fn({ width, height })` after the stage resizes. |
| `onOverlay(fn)` | `fn(ctx2d)` every frame after Matter draws; coordinates are CSS px. |
| `reset()`, `paused`, `setPaused(bool)` | Wired to the shared Pause / Step / Reset bar. |

**Controls** (`section`, `slider`, `toggle`, `select`, `button`, `segmented`, `readout`): each returns a handle with `.value` and `.set(v)`.
`.set(v)` also fires the row's callback; use `.set(v, { silent: true })` to update only the UI.
`select` / `segmented` options may be plain values or `{ label, value }` objects.

**Helpers**:
- `makeTank({ thickness, inset })` returns `{ bodies, floor, left, right, floorY, inner }`. Its bodies are rebuilt on resize, so read `tank.floor` (etc.) fresh each time rather than caching it.
- `addMouse({ stiffness, damping, showLine })` returns `{ mouse, constraint }`.
- Also: `randomBetween`, `spawnCircle(x, y, r, style?, options?)`, `bodiesAt(point)`, `drawArrow(g, from, vec, color?)`, `drawLabel(g, text, x, y, opts?)`.

## Leak check (dev only)

On every unmount the console logs (at the *verbose/debug* level) the live counts of engines, renders, runners, DOM listeners and Matter listeners. All of them should be 0. If any is not, the log is a warning instead. The same counts are also available in `window.__stageLeakStats`.

## Layout

```
src/main.js               bootstrap + page layout per route
src/shell/                router, stage (lifecycle + ctx), controls, helpers, theme, home, styles
src/challenges/registry.js
src/challenges/_template/
src/challenges/0X-*/      one folder per challenge owner
```
