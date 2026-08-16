# Lawscope Typography System

## Families and loaded weights

- **Merriweather:** 700 and 900 for headings and the editorial display voice.
- **Inter:** 400, 500, 600, and 700 for body/UI; 400 italic for genuine emphasis.
- **Fallbacks:** Georgia/Times for headings and native system sans-serif fonts for body/UI.

Google Fonts is loaded with preconnect hints and `display=swap`. The site remains fully readable when the external font request is blocked.

## Hierarchy

| Role | Size behavior | Weight | Line height | Tracking |
|---|---|---:|---:|---:|
| H1 | 34px mobile to 48px desktop | 900 | 1.15 | -0.02em |
| H2 | 28px mobile to 36px desktop | 700 | 1.22 | -0.015em |
| H3 | 22px mobile to 26px desktop | 700 | 1.30 | -0.01em |
| H4 | 19px mobile to 20px desktop | 700 | 1.35 | normal |
| General body | 16px | 400 | 1.60 | normal |
| Article body | 17px mobile to 18px desktop | 400 | 1.75 | normal |
| Metadata | 14px | 500 | 1.50 | 0.01em |
| Caption/eyebrow | 12px | 600 | 1.45 | 0.04em |

## Utilities

- `.text-h1` through `.text-h4`: heading appearance without changing semantic level.
- `.text-lead`: introductory/deck copy with a compact readable measure.
- `.text-meta`: dates, reading time, and supporting publication information.
- `.text-caption` and `.eyebrow`: short labels only; rendered uppercase.
- `.text-secondary`: supporting-text color.
- `.prose`: long-form article reading size, line height, and vertical rhythm.

Semantic heading levels must be selected for document structure. Typography utility classes never justify skipping heading levels.
