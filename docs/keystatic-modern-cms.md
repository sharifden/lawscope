# Modern CMS — Keystatic (Git-based, no companion)

**Status: installed, local mode enabled. Coexists with legacy Decap `/admin/`.**

Lawscope now has **two** editorial UIs that write to the **same** Markdown files in `/content`:

| UI | Path | Auth | Hosting |
|---|---|---|---|
| **Legacy Decap** | `https://getlawscope.com/admin/` | Netlify Identity + Git Gateway via `candid-choux-61d91a.netlify.app` | Needs `CMS_COMPANION_ORIGIN` in Vercel |
| **Modern Keystatic** | `http://localhost:4321/keystatic` (dev) | Local file system (dev) → GitHub API (prod) | No companion, no Identity |

Both enforce the same Lawscope schema (10 articles, 10 locked categories, singleton site.json) and are validated by `npm run check`.

## Why Keystatic is modern
- **No database, no companion site, no invite email flow.** Content is Markdown/JSON in Git — full audit trail, `main` stays protected.
- **Local-first:** `npm run keystatic:dev` opens a Notion-like visual editor that edits `content/articles/*.md` directly. No `CMS_COMPANION_ORIGIN` needed.
- **Same files, same build:** `npm run build` (lawscope) still generates `generated/` from `/content`. Keystatic just provides a nicer editor.
- **Production options (when you’re ready):**
  - `storage: { kind: 'local' }` — keep editing locally, push via Git (simplest, what you have now)
  - `storage: { kind: 'github', repo: 'sharifden/lawscope' }` — adds GitHub OAuth so you can edit from any browser at `https://getlawscope.com/keystatic` (requires `KEYSTATIC_GITHUB_TOKEN` in Vercel, no Netlify)
  - `storage: { kind: 'cloud' }` — Keystatic Cloud managed auth

## Files
- `keystatic.config.ts` — defines Articles, Categories, Site Settings with the exact Lawscope validations (8–100 char title, slug pattern, 100–260 char category description, 12–300 alt text, 160 excerpt, etc.)
- `astro.config.mjs` — runs Keystatic UI on Astro dev server (port 4321) without affecting `npm run preview` (port 4173)
- `src/pages/index.astro` — minimal Astro stub that redirects to `/keystatic`
- `package.json` — added `astro`, `@keystatic/astro`, `react`, `markdoc`

## Usage

### Local editing (modern, recommended)
```bash
npm install                # already done — 192 + 231 packages
npm run keystatic:dev      # → http://localhost:4321/keystatic
# Edit Articles / Categories / Site Settings visually
# Images go to assets/images + assets/images/social automatically
npm run build              # Lawscope still builds from the same files
npm run preview            # → http://localhost:4173 (public site)
```

Keystatic storage is `local` now, so you edit locally and `git push`. No login needed.

### Switching to GitHub-backed browser editing (optional, production)
1. In `keystatic.config.ts` change:
   ```ts
   storage: { kind: 'github', repo: 'sharifden/lawscope' }
   ```
2. Create a fine-grained GitHub PAT (Contents: Read & write on `lawscope` only)
3. Vercel → Settings → Environment Variables → `KEYSTATIC_GITHUB_TOKEN=github_pat_...` (Production only)
4. Redeploy — then `/keystatic` works in production with GitHub login. You can then remove the Netlify companion if you want.

### Validation
```bash
npm run keystatic:check   # tsc + node --check on keystatic.config.ts
npm run check             # full Lawscope pipeline + keystatic:check
```

## Migration from Decap
- No migration needed — both UIs edit the same files.
- Keep `admin/config.yml` (Decap) until you’re comfortable with Keystatic, then delete `/admin` and `netlify-companion/` if you want to fully retire the companion.
- Module 32 fallback gate allows this: replacement must stay GitHub-backed, keep `/admin` or `/keystatic`, keep content in Git, single editor, audit trail — Keystatic satisfies all.

## Comparison

|  | Decap (legacy) | Keystatic (modern) |
|---|---|---|
| Install | 2 pinned CDN scripts + Netlify site | `npm install @keystatic/core` + Astro |
| Auth | Netlify Identity email invite + `lawscope-editor` role + `CMS_COMPANION_ORIGIN` | Local (no auth) or GitHub OAuth |
| Companion site | `candid-choux-61d91a.netlify.app` required | None |
| Editor UX | Decap UI (richtext H2-4, but dated) | Notion-like document editor, image previews |
| Build | `git-gateway` → PR → Vercel | Direct Git write → Vercel |

**Recommendation:** Use Keystatic locally now (`local` mode) — it’s the simplest modern way and you already have it installed. Keep the Decap companion as fallback until you decide to switch Keystatic to `github` mode.

## Troubleshooting
- `http://localhost:4321/keystatic` 404? → Run `npm run keystatic:dev`, not `npm run preview`
- Lawscope public site 404? → That’s on `http://localhost:4173` via `npm run preview`, not Astro
- `npm run build` still says “fail-closed until CMS_COMPANION_ORIGIN is provisioned” → That’s Decap’s message; Keystatic doesn’t need it. Set `CMS_COMPANION_ORIGIN` in Vercel only if you keep using `/admin`.
