// Single source of truth for colors and fonts.
// Challenge code must read colors from here (via ctx.theme) — never hardcode hex values.

export const palette = Object.freeze({
  bg: '#E9EEF1',         // page + canvas background
  wall: '#B9C5CD',       // static walls, floors, ramps, divider lines
  ink: '#1F2A33',        // text
  slate: '#3E4B57',      // default dynamic bodies
  slateLight: '#7D8B95', // secondary bodies / variation
  accent: '#8A4B12',     // highlighted / selected body, active state
  accentSoft: '#C9A27E', // collision rings, hover state
  line: '#9AA6AE',       // constraints, vectors, graph lines
});

export const fonts = Object.freeze({
  serif: '"Libre Caslon Text", "EB Garamond", Georgia, serif',
  sans: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
});

/**
 * Body style presets. Returns a *fresh* Matter `render` options object each call,
 * so it is safe to mutate (e.g. `body.render.fillStyle = theme.accent`).
 *
 *   Bodies.circle(x, y, r, { render: theme.body('slate') })
 *
 * Kinds: any palette key, plus 'static' (alias of 'wall', no stroke),
 * 'sensor' (dashed-looking translucent outline) and 'hidden'.
 */
export function body(kind = 'slate') {
  switch (kind) {
    case 'static':
    case 'wall':
      return { fillStyle: palette.wall, strokeStyle: palette.wall, lineWidth: 0, visible: true };
    case 'sensor':
      return { fillStyle: 'transparent', strokeStyle: palette.line, lineWidth: 1, opacity: 1, visible: true };
    case 'hidden':
      return { visible: false };
    default: {
      const fill = palette[kind];
      if (!fill) throw new Error(`theme.body: unknown kind "${kind}"`);
      return { fillStyle: fill, strokeStyle: palette.wall, lineWidth: 1, visible: true };
    }
  }
}

/** Style for constraints (springs, strings, chains). */
export function constraint(opts = {}) {
  return { visible: true, strokeStyle: palette.line, lineWidth: 1, type: 'line', anchors: true, ...opts };
}

export const theme = Object.freeze({ ...palette, palette, fonts, body, constraint });
export default theme;
