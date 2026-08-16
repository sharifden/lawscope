# Design Token Contract

Module 02 establishes Lawscope's shared CSS custom properties and accessible reset.

## Rules for later modules

1. Components consume semantic tokens such as `--color-background`, `--color-text-primary`, `--color-brand`, and `--color-border`.
2. Components must not introduce raw hexadecimal, RGB, HSL, font-family, pixel, or rem values.
3. Add a primitive token in `:root` only when no existing token represents the value.
4. Prefer semantic spacing (`--space-section`, `--space-card`) over numbered spacing when the purpose is known.
5. Dark-mode components use the same semantic tokens; they do not add independent color overrides.
6. Focus styles remain visible and must not be removed.
7. Motion must use duration/distance tokens and respect `prefers-reduced-motion`.

## Token groups

- Font families, weights, type sizes, line heights, and letter spacing
- Four-pixel spacing scale and responsive semantic spacing
- Containers, reading widths, sidebars, touch targets, and reference breakpoints
- Border widths, corner radii, shadows, and elevation
- Motion durations, easing, distance, and reduced-motion values
- Stacking layers
- Light and dark palette primitives
- Theme-aware semantic colors

## Theme resolution

- Light mode is the default semantic mapping in `main.css`.
- An explicit `data-theme="dark"` attribute activates the dark mapping.
- An explicit `data-theme="light"` attribute preserves light mode.
- Without an explicit attribute or executable JavaScript, `prefers-color-scheme: dark` activates the progressive CSS fallback.
- Module 12 resolves the explicit `lawscope-theme` preference before stylesheets, then the operating-system preference, then light mode.
- The deferred theme controller persists only `light` or `dark`, follows later system changes only when no explicit choice exists, and synchronizes the accessible toggle.
- Strong light/dark border primitives provide at least 3:1 contrast against their control surfaces; text and interactive color pairs are verified to WCAG AA thresholds.
- See [Dark Mode Logic](./dark-mode.md) for persistence, transition, and test contracts.
- Module 13 uses shared consent-dialog and switch dimensions plus the runtime `--consent-safe-block-offset`; Module 14's fixed back-to-top control consumes that offset instead of overlapping a visible consent banner.
- `--safe-area-inset-block-end` and `--safe-area-inset-inline-end` expose browser safe-area environment values to fixed controls through the shared token layer.
- Module 15 combines the existing reveal duration, easing, and distance tokens with `--opacity-transparent`, `--opacity-opaque`, `--reveal-observer-root-margin`, and `--reveal-observer-threshold`; JavaScript reads the observer tokens instead of duplicating activation values.

## Accessibility baseline

- Global `:focus-visible` uses the semantic focus token.
- Body text and backgrounds use the approved high-contrast palette.
- Links remain underlined and use separate hover colors.
- Form controls inherit readable typography and colors.
- Media is intrinsically responsive.
- The `.visually-hidden` utility supports accessible labels and live regions.
- Reduced-motion users receive effectively instant non-essential transitions and animations.
