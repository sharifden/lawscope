# Back-to-top control contract

Module 14 adds one shared, progressively enhanced back-to-top control to generated public pages.

## Source and build integration

- Shared markup: `/pages/partials/back-to-top.html`
- Controller: `/js/back-to-top.js`
- Component styles: `/css/components.css`
- Page-top focus marker: `data-page-top-focus` on the shared Lawscope home link
- Build insertion point: `{{BACK_TO_TOP}}` in `/index.html`

The source button has native `type="button"` semantics, a visible Font Awesome arrow, visible “Top” text, an explicit accessible name, and the `hidden` attribute. If JavaScript is unavailable or initialization prerequisites are absent, the unavailable control remains out of both layout and the accessibility tree.

## Visibility rules

The controller displays the button only when all of these conditions are true:

1. the document is taller than the current viewport;
2. the vertical scroll position has reached at least one current viewport height;
3. neither the mobile navigation nor site-search surface is open; and
4. no enabled advertising slot is intersecting the viewport.

Scroll and resize events use passive listeners and are coalesced through `requestAnimationFrame`, so layout measurements occur at most once per rendered frame. The state is recalculated after browser history restoration through `pageshow`. An `IntersectionObserver` conservatively keeps the control away from visible advertising controls without performing per-scroll element geometry checks. In browsers without that observer, any enabled ad slot keeps the control hidden rather than risking overlap.

The shared header publishes its expanded-surface state through the `site-surface-open` root class and the `lawscope:site-surface-change` document event. The class provides immediate visual suppression; the event causes the button's native hidden state to be synchronized.

## Placement and layout safety

The control is fixed near the lower-right edge, uses a compact pill shape, and has a minimum inline and block size of `--size-touch-target` (44px). Its lower inset combines:

- the shared spacing gap;
- the live `--consent-safe-block-offset` written by the consent controller; and
- the device safe-area inset.

The inline inset also respects the device safe area. This consumes the existing consent measurement instead of repeating banner geometry work. The consent surface remains at a higher stacking level, and the button hides while navigation/search surfaces are expanded.

## Activation and focus

Native button activation supports pointer, Enter, and Space without custom key handlers. Before scrolling, focus moves with `preventScroll` to the shared Lawscope home link marked by `data-page-top-focus`. The viewport then returns to `top: 0`. This prevents keyboard focus from remaining on a fixed control that becomes hidden at the top and gives users a predictable, visible place from which to continue through the header navigation.

Normal operation uses smooth scrolling. When `prefers-reduced-motion: reduce` matches, the controller requests `behavior: "auto"`; component color transitions are also removed. The site-wide `:focus-visible` rule supplies the high-contrast focus indicator for both the control and the destination link.

## Privacy and content ownership

The controller reads no storage, sets no cookies, sends no requests, and captures no personal data. It does not own page content or CMS data. Future generated public templates should retain the shared partial and exactly one `data-page-top-focus` destination.

## Verification

Run:

```sh
npm run validate:back-to-top
npm run check
```

The executable validator checks source and generated markup, build integration, tokenized mobile-first styling, consent and navigation offsets, deferred isolated JavaScript, one-viewport and short-document behavior, focus transfer, smooth/reduced-motion behavior, ad and expanded-surface suppression, and passive/rAF event handling.
