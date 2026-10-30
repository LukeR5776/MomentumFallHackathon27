// Control-panel builder. Each method appends a row to the panel and returns a handle:
//
//   handle.value        current value
//   handle.set(v)       update the UI *and* fire the row's callback (onInput / onChange)
//   handle.set(v, { silent: true })   update the UI only
//   handle.el           the row element (for rare custom tweaks)
//
// All DOM listeners go through `listen`, so they are removed when the stage unmounts.

let uid = 0;
const nextId = (prefix) => `${prefix}-${++uid}`;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

function decimalsOf(step) {
  const s = String(step);
  return s.includes('.') ? s.split('.')[1].length : 0;
}

/**
 * @param {HTMLElement} root   container the rows are appended to
 * @param {(el, type, fn, opts?) => void} listen   auto-cleaned addEventListener
 */
export function createControls(root, listen) {
  const add = (row) => (root.append(row), row);

  return {
    /** Section heading. */
    section(title) {
      const row = add(el('h3', { class: 'ctl-section', text: title }));
      const handle = { el: row, value: title, set(v) { row.textContent = handle.value = v; } };
      return handle;
    },

    slider({ label, min = 0, max = 1, step = 0.01, value = min, onInput, format } = {}) {
      const id = nextId('sl');
      const fmt = format || ((v) => v.toFixed(decimalsOf(step)));
      const out = el('output', { class: 'ctl-value', for: id });
      const input = el('input', { id, type: 'range', min, max, step, value });
      const row = add(el('div', { class: 'ctl ctl-slider' },
        el('div', { class: 'ctl-row' }, el('label', { for: id, text: label }), out),
        input));
      const handle = {
        el: row,
        value: Number(value),
        set(v, { silent = false } = {}) {
          handle.value = Number(v);
          input.value = String(v);
          out.textContent = fmt(handle.value);
          if (!silent) onInput?.(handle.value);
        },
      };
      out.textContent = fmt(handle.value);
      listen(input, 'input', () => handle.set(input.valueAsNumber));
      return handle;
    },

    toggle({ label, value = false, onChange } = {}) {
      const id = nextId('tg');
      const input = el('input', { id, type: 'checkbox', role: 'switch' });
      input.checked = !!value;
      const row = add(el('div', { class: 'ctl ctl-toggle' },
        el('label', { for: id }, input, el('span', { class: 'ctl-switch', 'aria-hidden': 'true' }), el('span', { text: label }))));
      const handle = {
        el: row,
        value: !!value,
        set(v, { silent = false } = {}) {
          handle.value = input.checked = !!v;
          if (!silent) onChange?.(handle.value);
        },
      };
      listen(input, 'change', () => handle.set(input.checked));
      return handle;
    },

    select({ label, options = [], value, onChange } = {}) {
      const id = nextId('se');
      const opts = options.map((o) => (typeof o === 'object' ? o : { label: String(o), value: o }));
      const select = el('select', { id }, ...opts.map((o, i) => el('option', { value: i, text: o.label })));
      const indexOf = (v) => Math.max(0, opts.findIndex((o) => o.value === v));
      const row = add(el('div', { class: 'ctl ctl-select' }, el('label', { for: id, text: label }), select));
      const handle = {
        el: row,
        value: opts[indexOf(value ?? opts[0]?.value)]?.value,
        set(v, { silent = false } = {}) {
          const i = indexOf(v);
          select.value = String(i);
          handle.value = opts[i]?.value;
          if (!silent) onChange?.(handle.value);
        },
      };
      select.value = String(indexOf(handle.value));
      listen(select, 'change', () => handle.set(opts[select.value].value));
      return handle;
    },

    button({ label, onClick, variant } = {}) {
      const btn = el('button', { type: 'button', class: `ctl-btn${variant ? ` ctl-btn--${variant}` : ''}`, text: label });
      const row = add(el('div', { class: 'ctl ctl-button' }, btn));
      listen(btn, 'click', () => onClick?.());
      const handle = { el: row, button: btn, value: label, set(v) { btn.textContent = handle.value = v; } };
      return handle;
    },

    segmented({ label, options = [], value, onChange } = {}) {
      const opts = options.map((o) => (typeof o === 'object' ? o : { label: String(o), value: o }));
      const group = el('div', { class: 'ctl-seg', role: 'radiogroup', 'aria-label': label });
      const buttons = opts.map((o) => {
        const b = el('button', { type: 'button', role: 'radio', text: o.label });
        group.append(b);
        return b;
      });
      const row = add(el('div', { class: 'ctl ctl-segmented' }, label ? el('span', { class: 'ctl-label', text: label }) : null, group));
      const handle = {
        el: row,
        value: value ?? opts[0]?.value,
        set(v, { silent = false } = {}) {
          handle.value = v;
          opts.forEach((o, i) => buttons[i].setAttribute('aria-checked', String(o.value === v)));
          if (!silent) onChange?.(v);
        },
      };
      buttons.forEach((b, i) => listen(b, 'click', () => handle.set(opts[i].value)));
      handle.set(handle.value, { silent: true });
      return handle;
    },

    /** Read-only value row. `.set('42')` updates the text. */
    readout({ label, value = '' } = {}) {
      const out = el('output', { class: 'ctl-readout-value', text: String(value) });
      const row = add(el('div', { class: 'ctl ctl-readout' }, el('span', { text: label }), out));
      const handle = {
        el: row,
        value: String(value),
        set(v) {
          const s = String(v);
          if (s !== handle.value) out.textContent = handle.value = s;
        },
      };
      return handle;
    },
  };
}
