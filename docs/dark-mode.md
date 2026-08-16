# Dark Mode Logic

Module 12 completes Lawscope's shared light/dark theme behavior. Every future public page must preserve the pre-paint initializer, the deferred controller, the theme-aware stylesheets, and the existing header control data hooks.

## Preference order

The resolved theme follows one deterministic order:

1. An explicit valid `lawscope-theme` value in `localStorage` (`light` or `dark`).
2. The operating-system `prefers-color-scheme: dark` result when no explicit choice exists.
3. Light mode when neither source requests dark mode.

Unknown or corrupt stored values are ignored. Storage access is wrapped because privacy modes, browser policy, or disabled storage can throw. When persistence is unavailable, a selected theme still applies for the current page. The explicit theme preference is essential user-requested storage and remains independent of optional analytics or advertising consent; Module 13 explains this distinction in its preference center.

## Pre-paint contract

A deliberately small inline initializer runs in `<head>` before stylesheet requests. It performs only synchronous preference resolution and writes `data-theme="light"` or `data-theme="dark"` to the root element. This is the required exception to the project's deferred-public-script rule: deferring the initializer would allow the default palette to paint before a saved dark preference is known.

The complete controller remains deferred at `/js/theme.js`. It reruns resolution defensively, synchronizes the hidden enhancement-only control, and executes before `/js/header.js` reveals JavaScript-only header controls. CSS also retains a `prefers-color-scheme` fallback for cases where JavaScript is unavailable.

## Toggle and persistence

- The toggle's `aria-pressed` value is `true` when dark mode is active and `false` in light mode.
- Its accessible label always announces the next action: `Switch to dark mode` or `Switch to light mode`.
- Visible wide-screen text changes between `Dark mode` and `Light mode`; the decorative Font Awesome icon changes between moon and sun.
- A user activation saves only `light` or `dark`; no personal data, URL, event history, or analytics payload is stored.
- Once an explicit value exists, operating-system theme changes do not override it.
- With no explicit value, operating-system changes are applied live.
- The `storage` event synchronizes a preference changed or cleared in another tab.

Clearing Lawscope site storage returns theme resolution to the operating-system preference, then the light fallback.

## Palette and motion

Components consume semantic color properties, so changing the root mapping updates the header, search, buttons, article cards, advertising placeholder, category tiles, newsletter panel and form states, and footer without component-specific mode overrides.

User-triggered, system-triggered, and cross-tab changes receive a short tokenized transition for color, background, border, shadow, fill, and stroke. The transition class is absent during initial resolution, preventing an animated first paint. `prefers-reduced-motion: reduce` disables this palette transition.

The validator audits approved light and dark text/background pairs at the WCAG AA 4.5:1 normal-text threshold, focus indicators at 3:1, and strong control borders at 3:1. The normal decorative divider token is not used as the sole boundary for required form controls.

## Integration rules

1. Keep the initializer before all public stylesheets and use the exact `lawscope-theme` key.
2. Keep `/js/theme.js` deferred and before `/js/header.js`.
3. Never store theme choice in a URL, cookie, Git content, form payload, or analytics event.
4. Future components must use semantic theme tokens rather than raw colors or per-component dark overrides.
5. Do not reveal the toggle without JavaScript; the CSS system fallback remains automatic when scripting is unavailable.
6. Preserve native button semantics, 44-pixel targets, visible focus, and text labels.
7. Re-run `npm run validate:theme` and the full `npm run check` after changing palette or theme behavior.
