# Scroll fade-in enhancement contract

Module 15 adds restrained, one-time reveal motion to explicitly opted-in public-page regions. It is progressive enhancement: semantic content, links, forms, and landmarks remain fully present and visible without JavaScript.

## Files and hooks

- Controller: `/js/scroll-reveal.js`
- Shared styles: `/css/components.css`
- Observer and motion tokens: `/css/main.css`
- Opt-in hook: `data-scroll-reveal`
- Runtime state classes: `scroll-reveal--pending`, `scroll-reveal--visible`, and the root class `scroll-reveal-enabled`

The home page opts in its Featured Articles, Latest Articles, Popular Categories, Newsletter Signup, and main Footer navigation/content regions. The above-the-fold hero is deliberately excluded to avoid delaying or animating the likely Largest Contentful Paint. Advertising, consent interfaces, navigation, dialogs, status/error feedback, and the fixed back-to-top control are also excluded so important controls and policy surfaces never depend on decorative motion.

Future build-time templates may opt in meaningful lower-page regions using `data-scroll-reveal`; the controller owns its BEM-style pending and visible state classes. Primary content must never be inserted by this controller.

## Progressive-enhancement sequence

1. The deferred controller collects static opt-in regions.
2. If no regions exist, reduced motion is already requested, `IntersectionObserver` is unavailable, or observer tokens cannot be resolved, initialization stops immediately. No enabling class is added, so every region remains visible.
3. When enhancement is supported, all candidates receive the pending modifier while the root enabling class is still absent.
4. Regions already at or above the initial viewport bottom are marked visible immediately. This protects above-fold content, browser-restored scroll positions, and direct fragment navigation from an initial flash or unnecessary entrance motion.
5. Remaining regions are observed, focus safety and live reduced-motion listeners are registered, and only then is `scroll-reveal-enabled` added to the root.
6. An intersecting region receives `scroll-reveal--visible` and is immediately unobserved. Once all regions are visible, the observer and temporary listeners are disconnected.

The root class gates every hidden visual state. Removing JavaScript, blocking the script, an unsupported browser, invalid configuration, or an initialization error before the final enabling step therefore leaves content visible rather than hidden.

## Motion and observer behavior

The observer uses shared `--reveal-observer-root-margin` and `--reveal-observer-threshold` tokens. The CSS transition uses the existing `--duration-reveal`, `--easing-emphasized`, and `--motion-distance-reveal` tokens with shared transparent/opaque values. Movement is a short vertical translation paired with opacity; there are no loops, stagger timers, parallax effects, scroll listeners, or per-frame geometry work.

`IntersectionObserver` callbacks reveal each region once and then call `unobserve`. This keeps custom public JavaScript modest: there are no scroll handlers and therefore no layout-thrashing scroll work.

## Accessibility and reduced motion

- Without JavaScript, all content is visible and interactive.
- If `prefers-reduced-motion: reduce` matches at startup, the controller does not enable reveal states.
- If the preference changes to reduce during the session, every pending region becomes visible immediately, the root enabling class is removed, and observation/listeners are disconnected.
- CSS contains a matching reduced-motion override as a defensive fallback.
- A `focusin` event reveals an opted-in ancestor before a keyboard user interacts with it, preventing focus from landing in visually hidden content.
- Reveal states do not change document order, semantics, accessible names, focus order, pointer behavior, dimensions, or reserved advertising space.

## Privacy and security

The enhancement reads no storage, writes no cookies, performs no network requests, collects no interaction history, and sends no analytics events. It does not evaluate CMS Markdown or inject HTML.

## Validation

Run:

```sh
npm run validate:scroll-reveal
npm run check
```

The executable validator checks source/generated hooks, deferred loading, progressive CSS gating, immediate fallback behavior, initial-viewport handling, one-time observation, keyboard focus safety, startup and live reduced-motion behavior, listener cleanup, and the absence of scroll handlers, timers, storage, and network activity.
