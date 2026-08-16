# AdSense Slot 1 Contract

Module 07 defined the first planned advertising inventory region on the home page, immediately after the complete Featured Articles section. Module 31 now connects that provider-neutral slot contract to the separately gated Google AdSense adapter without changing its editorial placement, visible label, reserved-space behavior, or fail-closed defaults.

## Current state

Advertising is explicitly disabled in `/content/settings/site.json`. Publisher and unit values are all-zero public placeholders. Generated development and Preview output therefore contains auditable hidden slot markup, `provider: none`, and no Google advertising request or visible blank space after Featured Articles.

The complete resolved integration state is recorded in `/generated/data/advertising-manifest.json`. See `/docs/module-31-google-adsense.md` for the controlled seven-unit registry and activation runbook.

## Feature, readiness, environment, and host gates

`resolveAdFeatureState()` delegates to `/scripts/advertising.mjs`. Activation requires:

1. an explicit advertising request;
2. the `production` deployment environment;
3. owner attestations for account/site approval, current policy review, and Google-certified CMP readiness;
4. a real publisher ID and every approved unit ID; and
5. the exact `https://getlawscope.com` runtime origin.

A production activation request with an incomplete readiness state fails the build. Nonproduction output is forced to the inert provider/placeholders even if real values are supplied.

## Consent hook

`/js/ad-slots.js` consumes Module 13’s document event `lawscope:consent-change` and inspects `data-consent-advertising` during initialization. Pending consent preserves enabled inventory as `awaiting-consent`; explicit denial collapses it; a grant emits `lawscope:ad-slot-ready`. Global Privacy Control forces the advertising category denied.

Module 31’s `/js/adsense.js` listens only on eligible advertising pages. It does not load Google’s script before an explicit grant and all other gates. A loaded third-party script cannot be unloaded from the current document after withdrawal, but Lawscope collapses its units and initiates no further requests; a reload creates a fresh denied document.

## Provider status and no-fill behavior

The AdSense adapter reports through `lawscope:ad-status`:

```js
{ slot: 'home-below-featured', status: 'filled' }
{ slot: 'home-below-featured', status: 'no-fill' }
{ slot: 'home-below-featured', status: 'error' }
```

Status updates are ignored unless the feature gate passed and advertising consent is granted. `loading` and `filled` retain the reserved region. `unfilled` and `unfill-optimized` provider statuses map to `no-fill`; no-fill, configuration, loader, request, and timeout errors apply `hidden` to the complete `aside`, removing its minimum height and surrounding spacing.

## Layout and accessibility

- The inventory is a semantic `aside` named and visibly labeled “Advertisement.”
- It is outside the article-card grid and does not use editorial card styling.
- The container is centered and limited to the shared horizontal-ad maximum.
- The frame reserves 100 pixels on mobile and 90 pixels from the tablet breakpoint.
- The provider unit is responsive, width-constrained, and overflow-contained.
- Disabled, denied, no-fill, and error states hide the complete region.
- Semantic light/dark surface and border tokens preserve unmistakable editorial separation.

Advertising remains subject to current Google policy, sufficient original content, privacy disclosures, certified-CMP requirements where applicable, owner approval, and invalid-traffic monitoring.
