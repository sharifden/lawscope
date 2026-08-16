# Header and Navigation Contract

Module 04 establishes the shared Lawscope public header. Later page templates should reuse this structure and set `aria-current="page"` only on the matching primary route.

## Shared structure

- A semantic `header` contains the Lawscope text logo, primary `nav`, search trigger, theme control, and mobile-menu trigger.
- Primary destinations are Home, Articles, Categories, About, and Contact.
- The active link uses `aria-current="page"`, stronger weight, and an underline so state does not depend on color.
- A skip link is the first focusable element and targets the page's unique `main` landmark.
- Font Awesome 6.7.2 is loaded from cdnjs with Subresource Integrity, anonymous CORS, and no-referrer behavior. Controls retain accessible text labels.

## Responsive behavior

- Mobile-first layout keeps the logo left and site controls right.
- Below the medium breakpoint, JavaScript collapses the navigation into a stacked menu.
- At and above the medium breakpoint, navigation remains visible as a horizontal list.
- Native CSS cannot resolve custom properties inside media-query conditions. The 30, 48, 64, and 80 rem media conditions therefore mirror the canonical `--breakpoint-*` reference tokens in `main.css`; JavaScript reads the canonical medium token directly.
- Without JavaScript, all primary navigation links remain visible and usable; enhancement-only controls are hidden.
- Targets are at least the shared 44-pixel touch-target token, and the layout reflows without horizontal overflow at 320 CSS pixels.

## Keyboard contract

### Mobile menu

1. Enter or Space on **Open main menu** opens the panel.
2. Focus moves into the menu to its explicit close control.
3. Tab and Shift+Tab cycle within the open mobile menu.
4. Escape closes the menu and returns focus to the trigger.
5. The close control returns focus to the trigger.
6. Selecting a navigation link closes the mobile menu.
7. Moving to the desktop breakpoint safely releases containment and keeps navigation visible.

### Header search

1. Enter or Space on **Open site search** expands the search panel and starts the lightweight index load.
2. Focus moves to the labeled search field.
3. Escape or the close control collapses the panel, clears its in-memory query/results, and returns focus to the trigger.
4. The clear control appears only when text exists, restores the idle instructions, and returns focus to the field.
5. Empty submission is prevented. Settled searches announce their count and render at most six ordinary article links.
6. Arrow keys move from the input through results, Home/End reach list boundaries, and Enter retains native link activation.
7. The non-JavaScript and known-index-failure form target is the Articles route, while visible Articles and Categories links preserve browse paths.
8. Indexed matching, result rendering, request failure, and query privacy behavior are isolated in deferred `/js/search.js` and documented in [Search Index and Header Search](./search.md).

### Theme control

- The button uses `aria-pressed` to represent whether dark mode is active.
- Its accessible label always describes the next action: “Switch to dark mode” or “Switch to light mode.”
- The visible control text and moon/sun icon are synchronized before the JavaScript-enabled header controls are revealed.
- Module 12 isolates theme behavior in deferred `/js/theme.js`; menu and search behavior remain in `/js/header.js`.
- The full pre-paint, persistence, operating-system fallback, cross-tab, contrast, and reduced-motion contracts are documented in [Dark Mode Logic](./dark-mode.md).

## Integration rules for later modules

1. Reuse the BEM classes and data hooks; do not duplicate header logic per page.
2. Keep page links as ordinary anchors so navigation never depends on JavaScript.
3. Change only the `aria-current` assignment for the active page.
4. Preserve the deferred `/js/theme.js`, `/js/header.js`, and `/js/search.js` loading strategy in that order.
5. Search data/results behavior belongs only to `search.js`; do not add client-side Markdown fetching or query storage.
6. Keep the small pre-paint theme initializer before stylesheets on every future public-page template.
7. The CMS admin does not use this public header.
8. Menu/search state is mirrored through the `site-surface-open` root class and the `lawscope:site-surface-change` document event. Shared fixed controls consume this contract to hide while expanded header surfaces are active; it is not an analytics event.
