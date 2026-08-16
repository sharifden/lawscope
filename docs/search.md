# Search Index and Header Search Contract

Module 16 progressively enhances the shared header search form with a small, build-generated index. Search stays inside the header panel; the build does not create a separate search-results page or add search states to crawlable navigation.

## Build-time index

- `scripts/build.mjs` passes the exact `loadPublishedArticles()` result and the same build timestamp to `createSearchIndex()` in `scripts/generate-search-index.mjs`.
- The generator defensively excludes non-published, future-dated, and `preview: true` entries. Invalid published content already fails the authoritative content-graph validation rather than leaking into a partial index.
- `generated/data/search-index.json` contains only the schema version, item count, and the fields needed by search: article title, canonical route, controlled category name, tags, excerpt, and publication timestamp.
- Body Markdown, sources, author records, images, CMS workflow data, and draft metadata are not copied into the public payload.
- Entries use deterministic newest-first ordering with title and route tie-breakers. The committed ten-article baseline produces a compact file suitable for mid-range mobile hardware.
- The browser fetches only `/data/search-index.json`; it never fetches raw Markdown.

## Matching and result limits

`/js/search.js` normalizes Unicode, removes combining marks, folds case, turns punctuation into spaces, and collapses whitespace. Every normalized query token must occur somewhere in the combined title, category, tag, or excerpt text. Ranking then favors exact and partial title matches, followed by tags, category, and excerpt matches. Equal scores use publication date and title for deterministic ordering.

The interface reports the complete match count but initially renders no more than the panel’s `data-search-limit` value (six). Each result is an ordinary article link showing its title, category, and publication date. Result construction uses DOM methods and `textContent`; CMS strings are never inserted as HTML.

## Accessible states and keyboard behavior

The panel exposes five explicit states through `data-search-state`:

1. `idle` — instructions or a prompt to enter letters/numbers;
2. `loading` — the index request is in progress and `aria-busy="true"`;
3. `results` — count and bounded linked results;
4. `empty` — no match plus Articles and Categories browse links;
5. `error` — temporary failure plus the same browse alternatives.

The atomic polite status region changes only when the state or settled result count changes. Input matching is delayed briefly to avoid announcing every keystroke in a fast typing sequence. Query revisions prevent an older asynchronous load/search operation from overwriting a newer query or a closed panel.

Keyboard operation:

- Enter or Space on the header search control opens the panel and focuses the input.
- Down Arrow from the input moves to the first result; Up Arrow moves to the last.
- Up/Down Arrow moves predictably among result links; Up Arrow on the first result returns to the input.
- Home and End move to the first and last result.
- Enter on a result uses the anchor’s native navigation. Submitting from the input performs the current search and focuses its first result when available.
- Escape and the close button use the shared header controller to close the panel and return focus to the search trigger.
- Clear empties the input, restores the idle prompt, and returns focus to the input.
- Tab remains native, so the search panel does not create a focus trap.

## Progressive fallback and privacy

The source remains a labeled GET form targeting `/articles/`, and Articles/Categories are ordinary links. If the dedicated controller does not run, the form and browse navigation retain their native behavior. If the static index request reaches a known failure state, the enhanced submit listener releases non-empty form submissions to that ordinary fallback.

Search terms are processed only in browser memory. The enhancement does not put queries into history, local/session storage, cookies, analytics, beacons, or the JSON request. It loads no third-party search code and installs no global keydown handler. Closing the panel clears the field and rendered results. The static index request URL never contains the reader’s query.

## Integration rules

1. Keep `search.js` deferred and after `header.js`; the search controller consumes the existing `lawscope:site-surface-change` event rather than duplicating panel open/close ownership.
2. Future public page templates must reuse the search markup, data hooks, index URL, and both deferred controllers.
3. Continue generating the index from `loadPublishedArticles()` only. Never scan or serve raw content files to the browser.
4. Preserve article/category anchors as navigation fallbacks.
5. Do not add an indexable query-results route unless a later privacy, canonical, sitemap, and crawling review explicitly approves it.
6. Keep query analytics disabled unless a later consent and sensitive-data review approves a sanitized design.
