# Lawscope Planning & Requirements Document

**Document status:** Planning phase — approval required before implementation  
**Prepared for:** Lawscope  
**Planned production domain:** `https://getlawscope.com` (subject to purchase and verification)  
**Primary hosting:** Vercel  
**Content management:** Netlify CMS/Decap CMS, Git-based, at `/admin`  
**Audience:** General U.S. public  
**Version:** 1.0 — August 15, 2026

> **Planning rule:** This document defines requirements and implementation decisions. It contains no production HTML, CSS, or JavaScript. No build work should begin until this plan is approved.

## Planning assumptions and decisions requiring launch-time confirmation

1. `getlawscope.com` is a working name and canonical-domain placeholder until the domain is purchased.
2. All legal material will be reviewed under a documented editorial process. Lawscope will provide legal information, not individualized legal advice or attorney-client services.
3. “Netlify CMS” now commonly refers to the maintained project known as **Decap CMS**. The implementation may use the maintained Decap CMS package while preserving the requested `/admin` experience and Git-based workflow.
4. Because production hosting is Vercel, Netlify Identity and Git Gateway require a small companion Netlify service/site tied to the same GitHub repository. Vercel remains the public host; Netlify supplies authentication and the Git bridge only. This dependency must be validated in Module 01 and Module 32.
5. Newsletter and contact submissions require an external form/newsletter provider or Vercel serverless endpoint. Subscriber personal data must not be stored in the public or private Git content repository.
6. Markdown will be converted to indexable HTML **at build time**, rather than relying on browser-only rendering. This preserves the requested vanilla-JavaScript/no-framework stack while materially improving SEO, accessibility, resilience, and Core Web Vitals.
7. AdSense, GA4, social profile URLs, form endpoints, and production IDs will use non-tracking placeholders until approved accounts and consent controls are ready.
8. AdSense placements are planned inventory, not a promise of approval or revenue. Ads will remain disabled until the site has sufficient original content, required policy pages, and Google approval.

---

# 1. Project Overview

## 1.1 Site name, type, and purpose

**Lawscope** is a U.S.-focused legal information blog and editorial publication. Its purpose is to make common legal concepts easier to understand without oversimplifying them or implying that general information can replace advice from a licensed attorney.

Lawscope will publish practical explainers, issue guides, rights overviews, procedural summaries, and carefully contextualized legal news across ten categories. It will help readers:

- understand common U.S. legal terms and processes;
- identify questions to ask a qualified attorney;
- find credible primary and secondary sources;
- recognize when laws differ by state or depend on specific facts; and
- navigate to related educational material without sensationalism.

Lawscope is **not** a law firm, lawyer-referral service, emergency service, or substitute for professional legal advice.

## 1.2 Target audience profile

### Primary audience

Adults in the United States who are researching a legal concern for themselves, a family member, a workplace, a small business, or a property matter. Typical readers may have limited legal knowledge and may arrive from a search engine during a stressful or time-sensitive situation.

### Audience characteristics

- **Knowledge level:** Beginner to intermediate; unfamiliar with legal jargon, court structure, deadlines, and state/federal distinctions.
- **Needs:** Clear definitions, practical context, neutral explanations, authoritative sources, and visible limitations.
- **Devices:** Mobile-first usage is expected, with substantial desktop use for long-form reading and research.
- **Reading behavior:** Scans headings first, looks for direct answers, checks dates and sources, then follows related links.
- **Emotional context:** Some readers may be anxious, injured, recently arrested, facing job loss, considering divorce, dealing with immigration uncertainty, or responding to financial pressure.
- **Accessibility needs:** Legible typography, strong contrast, keyboard support, descriptive links, alt text, reduced-motion support, and uncomplicated navigation.
- **Trust expectations:** Current dates, named authorship, sourced claims, corrections, disclosures, and prominent disclaimers.
- **Privacy expectations:** Minimal data collection, clear consent choices, no sale of contact-form data, and transparent advertising/analytics disclosures.

### Representative user groups

1. A person trying to understand an arrest, Miranda warnings, bail, or the difference between charges and convictions.
2. A parent researching custody concepts, child support, or uncontested divorce.
3. A small-business owner comparing business structures or reviewing a contract concept.
4. An employee researching wages, leave, workplace discrimination, or termination.
5. An injured person learning the basics of insurance claims, negligence, and filing deadlines.
6. A tenant, landlord, buyer, or homeowner researching property rights and responsibilities.
7. An immigrant or family member seeking plain-language process information while being directed to qualified immigration counsel.
8. A consumer responding to debt collection, fraud, warranties, or a data breach.
9. A reader learning about constitutional and civil-rights protections.
10. A general reader following important court decisions and legal developments.

## 1.3 Primary goals

### Information goals

- Publish accurate, readable, original U.S. legal information in plain English.
- Build a coherent evergreen library around the ten launch categories.
- Make every article transparent about jurisdiction, date, sources, authorship, and limitations.
- Help readers move from a broad question to relevant related articles and authoritative sources.
- Earn repeat readership through consistency rather than urgency, fear, or clickbait.

### Revenue goals

- Build sustainable revenue primarily through Google AdSense.
- Increase qualified organic traffic and pages per session through useful internal linking.
- Place ads in predictable, clearly labeled locations that do not interrupt comprehension.
- Protect long-term trust and search visibility by keeping editorial decisions independent from advertising.

### Suggested success measures

- Growth in non-branded organic impressions and engaged sessions.
- Article completion/engaged-reading rate, related-article clicks, and category navigation.
- Newsletter opt-in conversion with verified consent.
- Returning-reader percentage.
- Core Web Vitals passing rate and Lighthouse scores of 90+.
- Low correction rate and timely updates to high-risk legal content.
- Ad viewability and revenue per thousand page views, monitored without increasing ad clutter.

## 1.4 Editorial identity and tone of voice

Lawscope should sound **serious, calm, neutral, precise, and approachable**.

### Voice principles

- Use plain English first; define necessary legal terms immediately.
- Distinguish federal law from state law and general rules from exceptions.
- Use “may,” “often,” and other qualified language where facts or jurisdiction change outcomes.
- Avoid guarantees, predictions, fear-based framing, and instructions that could be mistaken for personalized advice.
- Never describe an allegation as proven fact.
- Avoid partisan framing in legal news; separate reported facts, legal analysis, and opinion.
- Use short paragraphs, descriptive headings, lists, and examples.
- Identify emergency or deadline-sensitive topics and direct readers to official agencies or licensed counsel.
- Treat readers with dignity; do not shame people involved in criminal, family, debt, immigration, or injury matters.

### Editorial labels

Content types should be visibly labeled where relevant: **Explainer**, **Guide**, **Rights Overview**, **Legal News**, or **Update**. Opinion content is out of launch scope unless separately labeled and governed later.

## 1.5 Monetisation strategy

Google AdSense is the primary planned revenue source.

### Principles

- Editorial content takes priority over ad inventory.
- Every unit is visually separated and labeled **Advertisement**.
- Ads must never imitate navigation, download buttons, article cards, or legal resources.
- No pop-ups, forced interstitials, sticky full-screen ads, auto-playing media, or ads inserted directly beside urgent safety instructions.
- Legal, privacy, contact, editorial-policy, 404, and admin pages should be ad-free.
- Ad density must be lower on mobile than desktop and reviewed against current AdSense policies before launch.
- A Google-certified consent management platform should be used where required for visitors in the EEA, UK, and Switzerland; U.S. state privacy opt-outs should be supported where applicable.

### Planned inventory

- Home: one horizontal slot below featured content; an optional second slot only after enough latest content exists.
- Articles library: one in-feed slot after the first row or approximately six cards.
- Category pages: one in-feed slot after the first article group.
- Article pages: one mid-article slot at a natural section boundary, one desktop-only sidebar slot where width permits, and one end-of-article slot before related content.
- Categories overview: one horizontal slot after the category grid, only if it does not make the page feel ad-led.

## 1.6 Trust and authority signals strategy

Legal information is a high-trust, high-consequence topic. Every article must include:

- visible publication date and, where applicable, last-updated date;
- an author byline, initially “Lawscope Editorial”;
- a category and estimated reading time;
- specific source citations, favoring statutes, regulations, courts, agencies, and reputable institutions;
- an automatically appended legal disclaimer;
- a clear explanation when law varies by state;
- descriptive image alt text and non-misleading imagery;
- a correction path through the Contact page;
- links to the About, Editorial Policy, Privacy Policy, and Legal Disclaimer pages.

Additional trust practices:

- Never present AI-generated output as legal advice or as attorney-reviewed unless it genuinely was reviewed and documented.
- Do not fabricate citations, quotes, cases, credentials, or update dates.
- Use a published editorial policy covering research, review, corrections, conflicts, AI assistance, and updates.
- Maintain a review calendar for articles affected by changing statutes, regulations, agency rules, or court decisions.
- Add contributor credentials and review attribution only when a real, verified author/reviewer system exists.
- Do not use “expert reviewed” badges until the reviewer, qualifications, date, and review scope are verifiable.

## 1.7 CMS strategy overview

Lawscope will use Netlify CMS/Decap CMS as a Git-based editing interface at `/admin`.

- The editor signs in through an invite-only, password-protected account.
- The interface exposes structured fields rather than requiring direct Markdown editing.
- Content is saved to `/content/articles/` and `/content/categories/` in GitHub.
- Publishing to the production branch triggers Vercel to rebuild the site.
- The build generates article and category pages, search data, related links, metadata, and sitemap entries.
- One editor is supported at launch. The data model and author field remain compatible with multiple editors and contributors later.
- Role-based editorial review is a later-phase enhancement; launch access should remain least-privilege and invite-only.

## 1.8 Growth roadmap

### Launch scope

- One editorial identity.
- Ten content categories.
- Search, category filtering, newsletter capture, article sharing, analytics, and planned ad inventory.
- No public comments.

### Near-term growth

- Add verified author/contributor profiles and optional reviewer attribution.
- Add editorial workflow roles and multiple CMS users.
- Add richer search, topic hubs, and article-series relationships.
- Add update reminders and editorial-review dashboards.

### Later growth

- Moderated comments only after moderation, abuse, privacy, and legal processes are funded.
- State-specific topic hubs where editorial resources support accurate maintenance.
- Email digests and audience segmentation with explicit consent.
- Direct sponsorship only under a published advertising policy and clear separation from editorial work.

---

# 2. Sitemap

## 2.1 Hierarchical sitemap

```text
https://getlawscope.com/
├── /                                  Home
├── /articles/                         Law Articles
│   └── /articles/{article-slug}/      Individual Article Page
│       Example: /articles/understanding-miranda-rights/
├── /categories/                       Categories Overview
│   ├── /categories/criminal-law/
│   ├── /categories/family-law/
│   ├── /categories/business-law/
│   ├── /categories/employment-law/
│   ├── /categories/personal-injury/
│   ├── /categories/real-estate-property-law/
│   ├── /categories/immigration-law/
│   ├── /categories/consumer-law/
│   ├── /categories/civil-rights/
│   └── /categories/legal-news-updates/
├── /about/                            About Lawscope
├── /contact/                          Contact
├── /privacy-policy/                   Privacy Policy
├── /legal-disclaimer/                 Legal Disclaimer
├── /editorial-policy/                 Editorial Policy (supporting trust page)
├── /404.html                          404 Error document; served for unknown routes
└── /admin/                            Netlify CMS admin panel; authenticated, noindex
```

### Sitemap notes

- The seven primary pages are Home, Law Articles, Categories, About, Contact, Privacy Policy, and Legal Disclaimer.
- `/editorial-policy/` is included as a required supporting trust page because it is specified in the footer and E-E-A-T requirements. It is not added to the main navigation at launch.
- Search opens as a header panel/overlay and filters a prebuilt index; no separate indexable search-results page is required at launch.
- URLs use lowercase words, hyphens, no dates, and a consistent trailing-slash convention.
- Drafts, preview branches, `/admin/`, search states, and the 404 document are excluded from the XML sitemap.
- Article URL slugs should remain stable after publication. If a slug must change, a permanent redirect is required.

---

# 3. Wireframe Descriptions

## 3.1 Shared site shell

### Header and navigation

- A full-width semantic header sits at the top of every public page.
- Inside a centered container of approximately 1,200–1,280 pixels, the text logo **Lawscope** sits left; the primary links sit center/right; search and dark-mode controls sit at the far right.
- Desktop links: Home, Articles, Categories, About, Contact.
- The active page is indicated by more than color alone, using weight and an underline/bottom border.
- Search is either an inline field on wide screens or an icon that expands into a labeled field. Results show title, category, and date and support keyboard navigation.
- The dark-mode toggle has an accessible label and reflects saved/system preference.
- On mobile, the logo remains left and search, theme, and hamburger controls remain right. The hamburger opens a stacked navigation panel with visible focus management and a close control.
- The header may become modestly sticky after scroll, but must not occupy excessive vertical space or cover anchor targets.

### Breadcrumbs

All inner editorial pages except Home use breadcrumbs directly below the header and above the page title. They wrap on small screens, use descriptive labels, and expose `BreadcrumbList` structured data where appropriate.

### Main content width

- General page container: 1,200–1,280 pixels maximum.
- Long-form reading column: approximately 720–780 pixels.
- Article layout with sidebar: main reading column plus a 280–320 pixel sidebar and a 32–48 pixel gutter.
- Side gutters: 24–32 pixels desktop, 16–20 pixels mobile.

### Footer

A full-width footer follows the main content. It contains the Lawscope logo/tagline, grouped navigation, category links, social icons, copyright, and legal links. It is four columns on large screens, two columns on tablets, and one stacked column on mobile. Legal links remain text, not icon-only.

## 3.2 Home — `/`

### Desktop layout

1. **Header:** Shared header as specified above.
2. **Hero/intro:** A spacious two-column feature inside the main container. The left column contains category badge, article H1, excerpt, reading time, publication date, and a primary “Read the article” button. The right column contains a 16:9 CMS featured image. A subtle background panel distinguishes the hero without resembling an ad. If no item is explicitly featured, the newest published article is used.
3. **Featured Articles:** Section heading and short intro followed by a three-column grid. Each equal-height card includes image, category, title, excerpt, date/reading-time bar, and “Read more” link. The featured hero item is excluded to prevent duplication.
4. **AdSense Slot 1:** One centered horizontal container below the featured grid, clearly labeled “Advertisement.” It has reserved height to reduce layout shift and generous vertical spacing from content.
5. **Latest Articles:** Heading plus a six-card grid: three columns by two rows on large screens. Items are sorted newest first and exclude the hero where practical. A secondary “View all articles” button follows.
6. **Popular Categories:** Ten visual tiles in a five-by-two or responsive grid. Each tile includes an icon, category name, one-line description, and accessible linked surface. Color accents are restrained and never the only category cue.
7. **Newsletter Signup:** A full-width contained panel with headline, short benefit statement, one email field, Subscribe button, inline validation, success/error states, and privacy reassurance. Consent language links to the Privacy Policy.
8. **Footer:** Shared footer.

### Mobile behavior

- Hero becomes one column, with text first and image second; the H1 scales down without becoming cramped.
- Article and category grids become one column; a two-column category grid is acceptable above approximately 480 pixels.
- The ad unit uses a responsive format and never causes horizontal scrolling.
- Card excerpts may be limited visually to three lines, but titles and accessible text remain intact.
- Tap targets are at least 44 by 44 pixels; no hover-only information.

### Home ad policy

One launch ad below Featured Articles. A second home-page unit should not be activated until content volume and user behavior justify it.

## 3.3 Law Articles — `/articles/`

1. Shared header.
2. Breadcrumb: Home › Articles.
3. Page intro with H1 **Law Articles**, a concise explanation, and a small “Legal information, not legal advice” note.
4. Search/filter toolbar containing a keyword field, category select/chips, sort control (Newest by default; optionally Updated), and a visible result count. Controls have labels and a “Clear filters” action.
5. Article library in a three-column desktop grid. Each card follows the shared Article Card component.
6. One clearly labeled in-feed ad after the first six cards. It occupies a full grid row and cannot be confused with an article.
7. Pagination below the grid. Use crawlable page URLs and Previous/Next controls; avoid infinite scroll as the only navigation.
8. Empty state: helpful copy, reset action, category links, and no ad.
9. Newsletter panel after pagination.
10. Shared footer.

**Mobile:** Filters collapse into a clearly labeled drawer or stacked controls; cards become one column; pagination remains large and keyboard/touch accessible. Breadcrumbs wrap. No sidebar ad.

## 3.4 Categories Overview — `/categories/`

1. Shared header.
2. Breadcrumb: Home › Categories.
3. Intro block with H1 **Explore Legal Topics** and text explaining that law can differ by state and facts.
4. Ten-category grid. Desktop uses three columns (with the final row centered or aligned); tablet uses two; mobile uses one. Each tile includes icon, title, two-sentence description, and “Browse articles.”
5. Optional horizontal AdSense slot below the complete grid, not between individual categories at launch.
6. “Not sure where to start?” guidance panel linking to Articles and Contact for corrections/general site questions while clarifying that Lawscope cannot answer personal legal questions.
7. Newsletter panel.
8. Shared footer.

## 3.5 Individual Category Page — `/categories/{category-slug}/`

1. Shared header.
2. Breadcrumb: Home › Categories › Category name.
3. Category hero with icon, H1, category description, article count, and a jurisdiction reminder.
4. Optional featured article for that category in a horizontal card.
5. Article grid, three columns desktop and one column mobile, sorted by publication date.
6. Labeled in-feed ad after approximately six cards when enough content exists.
7. Pagination with stable crawlable URLs.
8. Related-category links chosen editorially; for example, Employment Law may link to Civil Rights and Business Law.
9. Newsletter panel with category-aware wording if the newsletter provider supports tagging.
10. Shared footer.

**Mobile:** Featured card stacks image above text; related categories become a wrapping list; no sidebar ad.

## 3.6 Individual Article Page — `/articles/{article-slug}/`

### Desktop layout

1. **Shared header.**
2. **Breadcrumbs:** Home › Category › Article title, with the final title shortened visually when necessary but preserved for assistive technology/schema.
3. **Article header:** Centered or aligned to the reading column. It contains category badge, one H1, excerpt/deck, author, publication date, last-updated date when present, and reading time. Dates use human-readable text and machine-readable values in implementation.
4. **Featured image:** Full reading-column width, or full main-column width in the sidebar layout. Maintain a 16:9 ratio where suitable. Caption/credit appears below if supplied.
5. **Article layout:** A 720–780 pixel main body plus a desktop sidebar. The sidebar may contain a table of contents, a single labeled AdSense unit, and a compact disclaimer/link to editorial policy. It must not become sticky if doing so would obscure content or violate ad policy.
6. **Article body:** Rich-text Markdown rendered to semantic content. Introductory summary, descriptive H2 sections, H3 subsections, lists, block quotes used only for sourced quotations, and tables only when responsive and accessible.
7. **Mid-article AdSense slot:** Inserted by the build system at an approved natural section boundary after sufficient editorial content, never inside a sentence, list, table, warning, or source quotation. Clearly labeled.
8. **Legal disclaimer box:** Automatically appended after the substantive body and before sources. It uses the required text verbatim, links to the full Legal Disclaimer, and cannot be removed in CMS.
9. **Source citations:** A heading and ordered list with source label, publisher/agency/court, URL, and access or publication date when relevant. External links identify their destination and use safe link attributes.
10. **Tags:** Wrapping linked badges below sources. Tags assist discovery but do not create indexable thin pages at launch.
11. **Share buttons:** X, Facebook, LinkedIn, and Copy Link. Use native/share URLs without loading third-party tracking widgets. Copy Link provides an accessible confirmation.
12. **End-of-article AdSense slot:** Labeled unit before related articles, with reserved space.
13. **Related articles:** Three cards from the same category, excluding the current article; recency and tag overlap guide selection. Fallback to related categories if fewer than three exist.
14. **Back-to-top button:** Appears after meaningful scrolling, sits clear of consent/ad controls, and returns focus predictably.
15. **Shared footer.**

### Mobile behavior

- Single reading column; desktop sidebar content moves inline. The table of contents can collapse under a “On this page” control.
- Sidebar ad is omitted. Mid-article and end units are responsive.
- Body text remains at least 17–18 pixels with comfortable line height.
- Wide tables gain a labeled horizontal-scroll wrapper; images remain within viewport.
- Share buttons wrap or use the system share sheet where available.

## 3.7 About Lawscope — `/about/`

1. Shared header.
2. Breadcrumb: Home › About.
3. Hero with H1 **About Lawscope**, concise mission statement, and a supporting editorial image or restrained abstract legal motif; no courthouse clichés are required.
4. “Why Lawscope exists” two-column section: narrative on the left, three trust principles on the right.
5. “How we work” process row: Research, Plain-English Editing, Source Review, Updates & Corrections.
6. “What we are—and are not” panel clearly stating that Lawscope is an educational publication, not a law firm.
7. “Our editorial standards” preview with link to Editorial Policy.
8. “Meet the publication” block naming Lawscope Editorial as the launch byline and explaining that verified contributors will be added later. Do not invent biographies or credentials.
9. “Corrections and feedback” callout linking to Contact.
10. Newsletter panel.
11. Shared footer.

**Ads:** None. Trust and institutional pages should not be monetized at launch.  
**Mobile:** All two-column sections stack; process items become a vertical sequence.

## 3.8 Contact — `/contact/`

1. Shared header.
2. Breadcrumb: Home › Contact.
3. H1 **Contact Lawscope** with text distinguishing editorial/site inquiries from requests for legal advice.
4. Two-column desktop area:
   - Left: contact form with Name, Email, Subject/type, Message, optional article URL, privacy consent, spam protection, and Submit.
   - Right: “Before you send” guidance, expected response time, corrections instructions, and emergency/legal-help disclaimer.
5. Submission states: inline validation, processing, success with reference/next steps, and recoverable failure with alternative contact method.
6. Privacy note linking to Privacy Policy.
7. Shared footer.

**Ads:** None.  
**Mobile:** Form first, guidance second; all controls full width; errors appear next to fields and in a summary.

## 3.9 Privacy Policy — `/privacy-policy/`

1. Shared header.
2. Breadcrumb: Home › Privacy Policy.
3. Narrow legal-document layout with H1, effective date, last-updated date, and a plain-language summary box.
4. Linked table of contents.
5. Policy sections in a single 760–820 pixel reading column.
6. Contact/privacy request callout near the end.
7. Shared footer.

**Ads:** None.  
**Mobile:** Table of contents collapses; long email addresses/URLs wrap; tables are avoided or scroll safely.

## 3.10 Legal Disclaimer — `/legal-disclaimer/`

1. Shared header.
2. Breadcrumb: Home › Legal Disclaimer.
3. Narrow document layout with H1, effective/updated dates, and the required disclaimer in a prominent amber-tinted box.
4. Sections covering no legal advice, no attorney-client relationship, jurisdictional differences, no guarantees, external links, emergencies/deadlines, and use-at-own-risk limitations subject to applicable law.
5. Contact link for content corrections—not personal legal questions.
6. Shared footer.

**Ads:** None.  
**Mobile:** Single column with readable spacing and no fixed elements obscuring text.

## 3.11 Editorial Policy — `/editorial-policy/`

1. Shared header.
2. Breadcrumb: Home › Editorial Policy.
3. H1 **Editorial Policy** with mission and scope summary.
4. Linked table of contents.
5. Sections for sourcing, writing standards, author/reviewer identification, legal review, state-law qualification, updates, corrections, conflicts, advertising independence, AI-assisted work, user submissions, and contact.
6. Visible last-updated date and a change-log note for material revisions.
7. Shared footer.

**Ads:** None.  
**Mobile:** Single-column document layout.

## 3.12 404 Error Page — `/404.html`

1. Minimal shared header without an active navigation state.
2. Centered error panel with a subtle “404,” H1 **This page is out of scope**, brief explanation, and two actions: Return Home and Browse Articles.
3. Search field and five popular category links.
4. A note inviting users to report a broken link through Contact.
5. Compact shared footer.

**Ads:** None. The page must return an actual HTTP 404 response.  
**Mobile:** Buttons stack and search fills available width.

## 3.13 Admin Panel — `/admin/`

### Login screen

- Netlify Identity/Decap authentication screen with Lawscope name, email, password, sign-in, password-reset flow, and no public registration.
- Clear message that access is restricted to authorized editors.
- No public navigation, ads, analytics, or indexing.

### Dashboard and content management

- The standard CMS dashboard lists collections and recent entries.
- **Articles:** list, search, create, edit, preview, delete with confirmation, save draft, submit/review where configured, and publish.
- **Categories:** list and edit the ten controlled categories; prevent accidental slug changes after launch.
- **Settings:** edit site title/tagline, social links, form endpoint, and approved analytics/ad identifiers.
- **Media:** upload/select images, inspect filenames, and complete required alt-text fields in article entries.
- The interface uses friendly field labels, help text, validation, and select controls instead of technical syntax.

### Newsletter subscribers

Netlify/Decap CMS does **not** natively provide a secure subscriber database view, and subscriber PII must not be committed to Git. The admin operating guide will provide a prominent link/bookmark to the selected newsletter provider’s authenticated subscriber dashboard. If a custom admin landing page is later introduced, it may show aggregate counts via a protected API, but not raw subscriber data in the repository.

### Mobile/admin considerations

The admin is primarily optimized for desktop editorial work. Basic tablet access may work, but publishing long legal articles by phone is not an acceptance requirement. Autosave expectations, image limits, and preview behavior will be documented.

---
# 4. Content Plan

## 4.1 Core editorial messages

- **Primary value proposition:** Clear explanations of U.S. law for everyday situations.
- **Standing jurisdiction note:** Laws and procedures can differ by state and change over time.
- **Standing advice boundary:** Lawscope provides general educational information, not advice for an individual matter.
- **Initial publication byline:** Lawscope Editorial.
- **Primary call to action:** Read the guide / Browse articles.
- **Secondary call to action:** Explore a category / Subscribe for new explainers.

## 4.2 Suggested page titles and display copy

### Home

- **Browser/SEO title:** Plain-English U.S. Legal Information | Lawscope
- **Hero category:** Criminal Law
- **Hero headline:** What Happens After an Arrest? A Plain-English Guide to the First Steps
- **Hero excerpt:** Learn what booking, initial appearance, bail, and charging decisions generally involve—and why timelines and rights can vary by state.
- **Hero meta:** 9 min read · August 12, 2026
- **Hero button:** Read the guide
- **Featured section heading:** Featured Legal Guides
- **Featured section intro:** Start with practical explainers on rights, responsibilities, and common legal processes.
- **Latest section heading:** Latest from Lawscope
- **Latest section intro:** Newly published and recently updated explanations of U.S. law.
- **Latest section action:** View all law articles
- **Categories heading:** Explore Popular Legal Topics
- **Categories intro:** Browse by subject to find clear background information and relevant next questions.

Suggested three featured cards:

1. **At-Will Employment: What It Means—and What It Does Not Mean** — An overview of at-will employment, major exceptions, and why an unlawful reason for termination can still matter.
2. **Security Deposits: Common Tenant and Landlord Rules** — Understand typical notice, deduction, documentation, and return requirements while checking your state’s law.
3. **Choosing Between an LLC and a Corporation** — Compare core liability, management, tax-election, and compliance considerations before speaking with an adviser.

Suggested six latest cards:

1. How Child Custody Decisions Are Commonly Made
2. What Debt Collectors Can and Cannot Do Under Federal Law
3. Negligence Explained: Duty, Breach, Causation, and Damages
4. What a Visa Overstay Can Affect
5. Free Speech and the First Amendment: The Government-Action Rule
6. Reading a Supreme Court Decision: Majority, Concurrence, and Dissent

### Law Articles

- **H1:** Law Articles
- **Intro:** Browse Lawscope’s plain-English guides to common U.S. legal topics. Filter by category or search by keyword. Every article identifies its publication date, sources, and limits.
- **Boundary note:** This library provides general educational information and does not replace advice from a qualified attorney.
- **Search placeholder:** Search articles by topic or phrase
- **Filter label:** Filter by legal category
- **Sort labels:** Newest first; Recently updated
- **Results text:** Showing {count} articles
- **Empty state:** We could not find an article matching those filters. Try a broader phrase, clear the filters, or browse all categories.
- **Pagination labels:** Previous page; Next page

### Categories Overview

- **H1:** Explore Legal Topics
- **Intro:** Legal questions often cross more than one area of law. Choose a category to begin, then follow related guides and cited sources for additional context.
- **Jurisdiction note:** Federal rules may apply nationwide, but state and local law can change the answer.
- **Guidance heading:** Not sure where to start?
- **Guidance text:** Browse the full article library or search for the legal term, process, or situation you are trying to understand. Lawscope cannot evaluate personal cases or recommend a specific legal strategy.
- **Actions:** Browse all articles; Search Lawscope

### Individual Category template

- **H1:** {Category Name}
- **Intro pattern:** Clear, general information about {category topic}, including common rights, responsibilities, procedures, and terms under U.S. law.
- **Count:** {count} published guides
- **Jurisdiction note:** Rules in this area may vary substantially by state and by the facts of a situation.
- **Featured label:** Start with this guide
- **Library heading:** Latest {Category Name} Articles
- **Related heading:** Related Legal Topics
- **Empty state:** No articles are published in this category yet. Browse all articles or subscribe for new Lawscope guides.

### Individual Article template

Suggested labels and reusable copy:

- **Byline:** By Lawscope Editorial
- **Dates:** Published {date} · Last updated {date}
- **Reading time:** {minutes} min read
- **Table of contents:** On this page
- **Sources heading:** Sources and Further Reading
- **Tags heading:** Topics in this article
- **Share heading:** Share this guide
- **Related heading:** Related Articles
- **Update note:** This article was reviewed and updated to reflect sources available on {date}.
- **Sources note:** Lawscope prioritizes statutes, regulations, court materials, and official agency guidance. External sources may change after publication.

The standard article opening should identify the legal concept, explain why it matters, state the jurisdictional scope, and preview what the guide covers. A recommended body pattern is: Key Takeaways; The Rule in Plain English; How the Process Usually Works; Important Exceptions; State-by-State Differences; Practical Questions to Ask; When to Seek Legal Help; Sources.

### About Lawscope

- **H1:** About Lawscope
- **Mission statement draft:** Lawscope exists to make U.S. legal information easier to understand. We publish carefully sourced, plain-English explanations that help readers learn the vocabulary, processes, and questions behind common legal situations. Our work is educational—not a substitute for advice from a lawyer who can evaluate the facts and law that apply to you.
- **Why heading:** Why Lawscope Exists
- **Why copy:** Legal information can be difficult to find, dense to read, and easy to misapply. Lawscope organizes important concepts into readable guides, identifies the jurisdictional limits, and points readers toward credible sources.
- **Principle 1 — Clarity:** We define legal terms, use direct language, and organize articles for scanning and careful reading.
- **Principle 2 — Accuracy:** We cite authoritative sources, show publication and update dates, and correct material errors transparently.
- **Principle 3 — Boundaries:** We explain general law without predicting outcomes or presenting information as personal legal advice.
- **Process heading:** How We Work
- **Research:** We begin with primary legal materials and authoritative public guidance whenever available.
- **Plain-English Editing:** We translate complexity without removing important qualifications or exceptions.
- **Source Review:** We check citations, dates, jurisdiction, and whether a source still supports the statement made.
- **Updates & Corrections:** We update time-sensitive guides and invite readers to report possible errors.
- **What we are heading:** What Lawscope Is—and Is Not
- **Boundary copy:** Lawscope is an independent educational publication. It is not a law firm, does not create attorney-client relationships, and cannot evaluate individual claims, deadlines, or legal strategies.
- **Editorial standards teaser:** Read how we select sources, handle corrections, disclose advertising, and use editorial tools responsibly.
- **Action:** Read our Editorial Policy
- **Publication identity:** Articles are initially published by Lawscope Editorial. Verified contributor and reviewer profiles may be introduced as the publication grows; Lawscope will not display unverified credentials.
- **Corrections heading:** Help Us Keep Information Accurate
- **Corrections copy:** If you believe an article contains an error, outdated source, or broken citation, send the article URL and a clear description through our Contact page.

### Contact

- **H1:** Contact Lawscope
- **Intro:** Contact us about corrections, source updates, accessibility, privacy, advertising, or general website questions. Lawscope cannot provide legal advice, assess a case, or match you with an attorney.
- **Subject choices:** Report a correction; Suggest a topic; Accessibility issue; Privacy request; Advertising inquiry; Technical problem; Other editorial inquiry.
- **Message helper:** Include the article URL, the statement you are asking us to review, and an authoritative source when reporting a correction.
- **Before you send heading:** Before You Send a Message
- **Response copy:** We aim to review editorial and website inquiries within five business days. Complex correction requests may take longer while sources are checked.
- **Urgent copy:** Do not use this form for emergencies, court deadlines, arrest assistance, immigration deadlines, or confidential legal facts. Contact emergency services, the relevant court or agency, or a qualified attorney as appropriate.
- **Consent copy:** I understand that Lawscope will use my information to respond to this inquiry as described in the Privacy Policy.
- **Submit button:** Send message
- **Success:** Thank you. Your message has been received. Keep a copy of any reference number shown here.
- **Error:** Your message could not be sent. Please try again or use the published support email once configured.

### Privacy Policy

- **H1:** Privacy Policy
- **Summary:** This policy explains what Lawscope collects, why it is collected, how advertising and analytics may use data, and the choices available to visitors.
- **Effective-date line:** Effective: {launch date} · Last updated: {date}

Recommended outline, to be finalized by qualified privacy counsel before launch:

1. **Scope and responsible entity:** Identify Lawscope/operator, websites covered, and contact details.
2. **Information visitors provide:** Newsletter email, contact-form name/email/message, privacy request information, and any voluntarily submitted details.
3. **Information collected automatically:** IP address, device/browser data, approximate location, page/referrer, cookie identifiers, interaction events, and server logs.
4. **Purposes and legal bases:** Site operation, security, responses, subscription delivery, measurement, advertising, consent, legitimate interests, and legal obligations as applicable.
5. **Cookies and similar technologies:** Essential storage, preferences such as dark mode, analytics, and advertising; describe the consent manager and withdrawal method.
6. **Google AdSense and advertising partners:** Personalized/non-personalized ads, partner links, Google’s own disclosures, and opt-out choices.
7. **Google Analytics 4:** Events collected, retention choice, IP handling where applicable, and consent behavior.
8. **Newsletter and contact providers:** Identify processors after selection; explain confirmation emails, unsubscribing, and retention.
9. **Disclosure of information:** Service providers, legal compliance, security, business transfer, and explicit statement about whether personal information is sold or shared under applicable U.S. state definitions.
10. **U.S. state privacy rights:** Describe rights that may apply under California and other comprehensive state laws—access, correction, deletion, portability, opt out of sale/sharing/targeted advertising, limit certain sensitive-data uses, and appeal—without overstating applicability.
11. **California notice at collection:** Categories, purposes, retention criteria, sale/sharing status, and request methods if applicable.
12. **EEA/UK/Swiss rights:** GDPR/UK GDPR notice for visitors in those regions, including controller, legal bases, rights, complaint route, and international transfers.
13. **Data retention:** Practical retention periods or criteria for contact messages, subscriber records, analytics, consent logs, and security logs.
14. **Data security:** Reasonable safeguards without guaranteeing absolute security.
15. **Children’s privacy:** Site is for a general audience and not directed to children under 13; provide a removal contact.
16. **Do Not Track and Global Privacy Control:** State how browser signals are handled, including GPC where legally required.
17. **International transfers:** Explain U.S. processing and relevant safeguards.
18. **External links:** Third-party sites have their own policies.
19. **Policy changes:** Material-change notice and updated date.
20. **Contact and rights requests:** Dedicated privacy contact and identity-verification process.

### Legal Disclaimer

- **H1:** Legal Disclaimer
- **Required article disclaimer, verbatim:**

> The information on this page is for educational purposes only and does not constitute legal advice. Laws vary by state. Always consult a qualified attorney for advice specific to your situation.

Recommended full-page sections and draft direction:

1. **General information only:** Lawscope publishes general U.S. legal information for educational purposes.
2. **No legal advice:** Content does not recommend a course of action for any person or replace advice based on complete facts.
3. **No attorney-client relationship:** Reading, subscribing, sharing, or contacting Lawscope does not create an attorney-client relationship.
4. **Jurisdiction and change:** Federal, state, local, tribal, and territorial rules may differ; law and official guidance can change after publication.
5. **No guarantee:** Lawscope aims for accuracy but does not warrant completeness, timeliness, or a particular result.
6. **Deadlines and emergencies:** Readers should not rely on Lawscope to calculate limitation periods, filing dates, appeal deadlines, court dates, or emergency steps.
7. **External sources:** Links are supplied for context and do not constitute endorsement; external materials can move or change.
8. **Professional help:** Readers should consult a licensed attorney or authorized professional in the relevant jurisdiction.
9. **Contact boundary:** Corrections are welcome; personal facts submitted through Contact will not receive legal analysis.

### Editorial Policy

- **H1:** Editorial Policy
- **Opening:** Lawscope’s editorial process is designed to make legal information clearer while preserving the limits, exceptions, and jurisdictional context that affect its meaning.

Recommended outline:

1. Mission, audience, and scope.
2. Article selection and public-interest criteria.
3. Primary-source preference and citation standards.
4. Plain-English writing and terminology standards.
5. Federal/state/local jurisdiction labels and limitations.
6. Authorship, contributor credentials, and reviewer disclosure.
7. Fact-checking and pre-publication checklist.
8. Publication dates, review dates, and material-update dates.
9. Corrections process: report, investigate, correct, annotate material changes.
10. Legal-news standards: separate facts, procedural posture, allegations, holdings, and commentary.
11. Conflicts of interest, gifts, affiliate relationships, and sponsored content.
12. Advertising independence: advertisers do not select, edit, or approve editorial content.
13. AI policy: tools may assist approved back-office tasks, but sources and claims must be verified by a responsible human editor; AI output is never presented as legal advice; no fabricated citations; confidential user material is not entered into public AI tools.
14. User submissions and privacy.
15. Accessibility and inclusive language.
16. Contact details and policy-change record.

### 404 page

- **Eyebrow:** Error 404
- **H1:** This Page Is Out of Scope
- **Copy:** The address may be outdated, incomplete, or no longer available. Search Lawscope or return to a trusted starting point.
- **Primary action:** Return to Home
- **Secondary action:** Browse Articles
- **Search placeholder:** Search legal topics
- **Popular links heading:** Popular categories
- **Broken-link note:** Found this link on Lawscope? Please report it through our Contact page.

## 4.3 Category descriptions and 30 realistic article placeholders

Each title is a planning placeholder, not approved legal content. Before publication, every article requires jurisdiction scoping, source research, editorial review, a unique excerpt, and a current update date.

### Criminal Law

**Category description:** Plain-English guides to criminal procedure, constitutional protections, common charges, court stages, and the difference between an accusation and a conviction.

1. **Understanding Miranda Rights: When Police Must Read Them** — Explain custody, interrogation, common misconceptions, and suppression as a possible remedy.
2. **What Happens After an Arrest? Booking, Bail, and the First Court Appearance** — Outline typical early stages while emphasizing state differences.
3. **Misdemeanor vs. Felony: Key Differences and Why Classification Matters** — Compare potential penalties, procedures, collateral effects, and jurisdictional variation.

### Family Law

**Category description:** General information about marriage, divorce, parenting, support, adoption, and other family-court processes that vary significantly by state.

1. **How Child Custody Decisions Are Commonly Made** — Introduce best-interest factors, legal/physical custody, parenting plans, and court discretion.
2. **Contested vs. Uncontested Divorce: What Changes in the Process** — Compare agreement, filings, disclosure, hearings, time, and cost considerations.
3. **Child Support Basics: Income, Guidelines, and Modification** — Explain guideline models, orders, enforcement, and changed circumstances.

### Business Law

**Category description:** Foundational legal information for U.S. entrepreneurs and small businesses, including formation, contracts, compliance, and risk allocation.

1. **Choosing Between an LLC and a Corporation** — Compare ownership, management, formalities, liability, and the need for tax advice.
2. **What Makes a Contract Enforceable? Five Core Concepts** — Cover offer, acceptance, consideration, capacity, legality, and important exceptions.
3. **Registered Agents Explained: What Small Businesses Should Know** — Describe the role, address requirements, state notices, and ongoing compliance.

### Employment Law

**Category description:** Explanations of common workplace rights and obligations under federal law, with clear warnings that state and local protections may be broader.

1. **At-Will Employment: What It Means—and What It Does Not Mean** — Explain the default rule and major contractual, statutory, and public-policy limits.
2. **Overtime Pay Basics Under Federal Law** — Introduce workweeks, the salary-basis issue, exemptions, recordkeeping, and state-law differences.
3. **Workplace Discrimination Claims: Protected Traits and First Steps** — Explain adverse actions, agency deadlines, documentation, and anti-retaliation protections generally.

### Personal Injury

**Category description:** Educational guides to negligence, insurance claims, damages, evidence, and deadlines after an injury, without evaluating case value.

1. **Negligence Explained: Duty, Breach, Causation, and Damages** — Define the common elements and show why facts and state law matter.
2. **What to Know Before Speaking With an Insurance Adjuster** — Discuss documentation, recorded statements, authorizations, releases, and deadlines neutrally.
3. **Statutes of Limitations in Injury Cases: Why Deadlines Differ** — Explain accrual, tolling, government claims, and why readers need jurisdiction-specific advice promptly.

### Real Estate & Property Law

**Category description:** General information for tenants, landlords, buyers, sellers, and owners about leases, transactions, title, boundaries, and property obligations.

1. **Security Deposits: Common Tenant and Landlord Rules** — Review documentation, deductions, itemization, return periods, and state/local law.
2. **What Is Title Insurance and What Does It Usually Cover?** — Distinguish owner and lender policies, covered title risks, and exclusions.
3. **Boundary Disputes: Surveys, Deeds, Easements, and Next Steps** — Introduce evidence sources and why self-help can create additional problems.

### Immigration Law

**Category description:** Carefully qualified explanations of U.S. immigration terms and processes, with prominent advice to use authorized, qualified legal help for individual matters.

1. **Green Card vs. U.S. Citizenship: Rights, Duties, and Key Differences** — Compare status, voting, travel, removal risk, renewal, and naturalization generally.
2. **What a Visa Overstay Can Affect** — Explain status, unlawful presence at a high level, exceptions, and the need for prompt individualized advice.
3. **The U.S. Asylum Process: An Introductory Overview** — Distinguish affirmative and defensive processes, filing considerations, evidence, and changing rules.

### Consumer Law

**Category description:** Guides to federal and state protections involving debt collection, credit, purchases, scams, warranties, privacy, and unfair practices.

1. **What Debt Collectors Can and Cannot Do Under Federal Law** — Cover communications, validation information, harassment restrictions, disputes, and state additions.
2. **How to Dispute an Error on Your Credit Report** — Explain checking reports, written disputes, investigation, documentation, and regulator resources.
3. **Consumer Warranties: Express, Implied, and “As Is” Sales** — Introduce warranty types, limitations, Magnuson-Moss context, and state variation.

### Civil Rights

**Category description:** Accessible explanations of constitutional and statutory protections, government action, discrimination, voting, protest, privacy, and enforcement concepts.

1. **Free Speech and the First Amendment: The Government-Action Rule** — Explain why constitutional speech protections usually constrain government, not private platforms or employers.
2. **Reasonable Accommodations Under the ADA: A General Overview** — Introduce covered settings, interactive processes, undue hardship, and individualized analysis.
3. **Your Rights at a Peaceful Protest: Speech, Assembly, and Lawful Limits** — Discuss public forums, permits, police orders, recording, and local rules without giving tactical legal advice.

### Legal News & Updates

**Category description:** Neutral context for important U.S. court decisions, legislation, regulations, and agency developments, clearly dated and updated as events change.

1. **Reading a Supreme Court Decision: Majority, Concurrence, and Dissent** — Teach readers how opinions are structured and what portions control.
2. **How a Federal Rule Becomes Final—and When It Can Be Challenged** — Explain notice, comments, final rules, effective dates, and judicial review at a high level.
3. **What a Court Injunction Does: Temporary Orders, Scope, and Appeals** — Clarify temporary restraining orders, preliminary/permanent injunctions, parties, and changing appellate status.

## 4.4 Newsletter copy

- **Headline:** Understand the Law, One Clear Guide at a Time
- **Subtext:** Get new Lawscope explainers and important editorial updates in your inbox. No case advice, no daily noise, and you can unsubscribe at any time.
- **Field label:** Email address
- **Placeholder:** you@example.com
- **Button:** Subscribe
- **Privacy reassurance:** We use your email only to send Lawscope updates and manage your subscription. Read our Privacy Policy.
- **Success:** Please check your inbox to confirm your subscription.
- **Existing subscriber:** That address is already subscribed. Check your inbox or manage your preferences.
- **Error:** We could not complete your subscription. Please try again shortly.

Double opt-in is recommended even where not strictly required.

## 4.5 Footer copy

- **Tagline:** U.S. law, explained with clarity and care.
- **Short description:** Lawscope publishes general legal information for educational purposes. It is not a law firm and does not provide legal advice.
- **Navigation group:** Home; Articles; Categories; About; Contact.
- **Category group:** All ten category links, divided into two columns on wide layouts.
- **Policy group:** Privacy Policy; Legal Disclaimer; Editorial Policy; Contact.
- **Social labels:** Follow Lawscope on X; Facebook; LinkedIn. Only display accounts that are active and maintained.
- **Copyright:** © {current year} Lawscope. All rights reserved.

---

# 5. Netlify CMS Configuration Plan

## 5.1 Platform architecture

The editor-facing product will be identified as **Lawscope CMS** while using the maintained Netlify CMS/Decap CMS interface.

Content flow:

1. Authorized editor opens `https://getlawscope.com/admin/`.
2. The admin client authenticates against the companion Netlify Identity service.
3. Git Gateway writes approved content to the GitHub repository.
4. Draft/editorial-workflow changes remain unpublished; publishing merges/commits to the production branch.
5. GitHub notifies Vercel through the repository integration.
6. Vercel runs the build-time Markdown generator.
7. Static HTML pages, the search index, related-article data, feeds if added, and XML sitemap are regenerated.
8. Vercel deploys atomically to its CDN.

### Cross-platform validation gate

Before templates are built, a proof of concept must verify that authentication, repository writes, editorial workflow, preview deployments, and production rebuilds work with Vercel as public host. If Netlify changes Identity/Git Gateway availability or cross-origin behavior, the approved fallback is a GitHub-backed CMS authentication service that retains `/admin` and Git-based storage. A fallback change requires owner approval but not a front-end redesign.

## 5.2 Articles collection

**Repository folder:** `/content/articles/`  
**File format:** Markdown with YAML front matter  
**Entry label:** Title  
**Slug pattern:** sanitized title slug, checked for uniqueness and kept stable after publication

| Field | CMS control and rule | Implementation behavior |
|---|---|---|
| Title | String; required; recommended 45–70 characters | H1, card title, default SEO/OG title, and initial slug source |
| Slug / URL | Auto-generated from title; editor can review before first publish | Lowercase hyphenated route; changes after publish require redirect |
| Publish Date | Datetime; required | Visible date, sort key, schema datePublished, sitemap metadata |
| Last Updated Date | Datetime; optional | Show only when a substantive review/update occurred; schema dateModified |
| Author Name | String; default “Lawscope Editorial” | Visible byline and schema author; future relation field when author profiles launch |
| Category | Select/relation; required; exactly one of ten | Category badge, route relation, related-content input |
| Tags | List of strings; optional; normalized capitalization | Search and related content; no indexable tag archives at launch |
| Featured Image | Image upload; required for featured eligibility | Hero, article header, cards, OG image source |
| Featured Image Alt Text | String; required when image supplied | Describes content/function; empty only for truly decorative images, which article images should rarely be |
| Excerpt / Summary | Text; required; maximum 160 characters | Cards and on-page deck; may seed meta description but has a separate limit |
| Body Content | Markdown rich-text; required | Sanitized and rendered at build; headings begin at H2 |
| Custom SEO Title | String; optional; recommended maximum about 60 characters before brand | Overrides default metadata, not on-page H1 |
| Meta Description | String; required for publication; maximum 155 characters | Search and social description fallback |
| Featured Article | Boolean; default false | Homepage featured query; build warns if too many are selected |
| Status | Select: draft or published | Secondary editorial label; actual production visibility is controlled by workflow/branch state |
| Reading Time | Read-only derived value; not manually authored | Build calculates from body word count, with sensible handling of headings/lists |
| Legal Disclaimer | Not exposed as an editable field | Build automatically appends the approved standard disclaimer component |
| Source Citations | List; required for publication, each with label and URL; optional date/publisher recommended | Creates numbered source list and supports editorial validation |

### Article validations

- Publication is blocked or build fails clearly if title, publish date, category, body, excerpt, meta description, featured image, alt text, or sources are missing.
- Excerpt and meta-description character counters are visible.
- Body H1s are prohibited because the template supplies the single page H1.
- Unsafe embedded scripts, iframes, and raw HTML are rejected or sanitized.
- Future-dated content is excluded unless a scheduling mechanism is intentionally configured.
- The build reports duplicate slugs, invalid category relations, broken local image references, and malformed citation URLs.
- Exactly one primary category is used; tags supply cross-topic context.

### Reading-time rule

Calculate on each build from rendered text, using a documented baseline of roughly 225 words per minute, rounded up to at least one minute. Exclude front matter, captions, legal disclaimer, ad labels, navigation, and source URLs from the count. Display as an estimate.

## 5.3 Categories collection

**Repository folder:** `/content/categories/`  
**Expected launch entries:** exactly ten

| Field | Rule | Use |
|---|---|---|
| Category Name | Required; controlled vocabulary | H1, badges, menus |
| Slug | Required; unique; locked after launch | Canonical category URL |
| Description | Required; approximately 140–240 characters | Category hero, category tile, metadata input |
| Icon | Font Awesome class, selected from an approved list | Decorative/supporting tile icon; category name remains visible |
| Color accent | Optional constrained color token, not arbitrary CSS | Accent border/icon; never sole meaning cue |

The collection must prevent deletion of a category still referenced by articles. Icon and accent values should be selected from approved options to preserve accessibility and consistency.

## 5.4 Settings collection

Use a singleton settings file rather than multiple entries.

| Field | Rule and purpose |
|---|---|
| Site title | Default “Lawscope”; used in metadata and header |
| Site tagline | Default “U.S. law, explained with clarity and care.” |
| Social media URLs | Optional validated HTTPS URLs for X, Facebook, LinkedIn; hide empty channels |
| Newsletter form endpoint | Environment-specific HTTPS endpoint; avoid committing secret API keys |
| AdSense Publisher ID | Public publisher ID only; feature remains off until approval and consent readiness |
| Analytics ID | Public GA4 measurement ID only; loaded according to consent |

Recommended additional controlled settings are canonical site URL, default social image, contact endpoint, support email, ad/analytics enable toggles, and privacy-policy effective date. Secrets belong in Vercel/Netlify environment variables, never CMS content.

## 5.5 Authentication plan

- Netlify Identity registration is **invite-only**; public signup is disabled.
- One named editor account is invited at launch. Shared credentials are prohibited.
- Use a strong unique password and multi-factor authentication where the selected identity service supports it.
- Password reset links are short-lived and sent only through the configured identity service.
- `/admin/` is noindex and disallowed in robots, but authentication—not robots.txt—is the security boundary.
- Git Gateway is granted only the repository access needed to manage content.
- GitHub branch protection guards the production branch and preserves review/audit history.
- Remove access immediately when an editor leaves; review users and access logs quarterly.
- Define a recovery owner and test account recovery before launch.

## 5.6 Media plan

### Storage

- CMS uploads go to `/assets/images/` in Git.
- Standard Git storage is adequate at launch if files are compressed and repository growth is monitored.
- Netlify Large Media is not required initially and introduces another operational dependency. Reassess when repository size or editorial volume justifies object storage/image CDN migration.
- Filenames use descriptive lowercase hyphenated terms, with no personal information.

### Recommended source sizes

| Use | Source ratio and dimensions | Target guidance |
|---|---|---|
| Home hero | 16:9, about 1,600 × 900 px | High-quality source; generally under 300–400 KB after optimization |
| Article featured image | 16:9, about 1,600 × 900 px | Same source can generate responsive derivatives |
| Article card | 16:9 derivative, about 800 × 450 px | Generally under 120–180 KB |
| Open Graph image | 1.91:1, 1,200 × 630 px | Dedicated crop or safe-area-aware derivative |
| Category imagery, if later used | 4:3 or square, at least 800 px | Icons are preferred at launch |

The build should generate responsive AVIF/WebP plus a broadly compatible fallback where tooling permits. Width and height are always emitted to prevent layout shift. Do not use images of identifiable private individuals in sensitive legal contexts without appropriate rights and editorial justification.

### Placeholder policy

`picsum.photos` may be used only during development. Before launch, replace random remote placeholders with licensed, owned, or properly sourced CMS media. Remote random images are unsuitable for stable metadata, privacy, brand consistency, and legal-topic sensitivity.

## 5.7 Editorial workflow

1. Sign in at `/admin/`.
2. Choose **Articles** and create an entry.
3. Enter title; confirm the generated slug before first publication.
4. Select one category and appropriate tags.
5. Upload the featured image and write useful alt text.
6. Draft the excerpt and article body using H2/H3 structure.
7. Add authoritative source citations.
8. Complete SEO title if needed and a unique meta description.
9. Check publication/update dates and featured toggle.
10. Save as draft. Use the CMS preview and Vercel preview deployment to review layout, links, images, disclaimer, and metadata.
11. Run the editorial checklist: accuracy, jurisdiction, allegations, citations, dates, accessibility, privacy, and advice boundary.
12. Publish. The production-branch commit triggers Vercel.
13. Confirm the live page, sitemap inclusion, canonical URL, social preview, and search-index entry.
14. If a material error is found, correct promptly and update the article according to the Editorial Policy.

### Draft and publish semantics

Use the CMS editorial workflow when supported. A manual “Status” field can aid filtering, but it must not be the only safeguard: only entries merged to the production branch and marked publishable are included in the public build. Draft branches may create protected Vercel previews but must not enter the public sitemap or analytics.

## 5.8 Newsletter subscriber management

- Use a dedicated provider with double opt-in, unsubscribe handling, suppression lists, exports, and a data-processing agreement.
- The CMS Settings collection stores only the public form endpoint or list identifier—not subscriber records or secret keys.
- Editors view and export subscribers only in the provider’s authenticated dashboard.
- A shortcut can be documented beside the CMS; a custom link may be added later if it does not weaken security.
- GA4 records a successful signup event without sending the email address or other personal data.

## 5.9 Backups and operational resilience

- GitHub history is the primary content audit trail.
- Enable protected branches and repository-owner recovery.
- Export newsletter and form data according to a documented schedule and retention policy.
- Keep a secure off-platform backup of the repository and environment-variable inventory.
- Test restoration, CMS login, and a full Vercel rebuild before launch and at least twice yearly.

---

# 6. Style Guide

## 6.1 Design character

Lawscope should feel like a modern editorial reference: calm, spacious, authoritative, and readable. It should avoid ornate law-firm styling, aggressive red alerts, excessive courthouse/gavel imagery, and dense dashboard-like interfaces.

## 6.2 Light-mode color palette

| Token purpose | Value | Guidance |
|---|---:|---|
| Page background | `#FFFFFF` | Primary reading surface |
| Alternate background | `#F8F9FA` | Section bands, ad containers |
| Primary text | `#1A1A2E` | Headings and body text |
| Secondary text | `#4A4A68` | Metadata and supporting copy |
| Brand deep navy | `#12355B` | Logo, primary buttons, strong accents |
| Brand hover/active | `#0B2745` | Hover/pressed state on navy controls |
| Link blue | `#1D4ED8` | Inline links; underlined in body copy |
| Link hover | `#1E40AF` | Hover/active links |
| Focus ring | `#2563EB` | High-visibility focus outline |
| Card background | `#FFFFFF` | With subtle border and shadow |
| Border/divider | `#E5E7EB` | Dividers, card outlines, form borders |
| Muted surface | `#F1F5F9` | Filter bars, secondary panels |
| Success | `#166534` | Success text/icons with pale background |
| Error | `#B91C1C` | Errors with text/icon, not color alone |
| Disclaimer border | `#D97706` | Legal disclaimer emphasis |
| Disclaimer background | `#FFFBEB` | Visible but calm amber tint |
| Ad container | `#F8F9FA` | Subtle background with border/label |

Primary navy buttons with white text must be contrast-checked at all states. Body links remain underlined by default so link recognition does not depend on color.

## 6.3 Dark-mode color palette

| Token purpose | Value | Guidance |
|---|---:|---|
| Page background | `#0B1120` | Deep blue-black, not pure black |
| Alternate background | `#0F172A` | Section bands |
| Card/surface | `#111827` | Cards and elevated panels |
| Raised surface | `#172033` | Hovered/active surfaces |
| Primary text | `#F3F4F6` | Main text |
| Secondary text | `#CBD5E1` | Metadata/supporting text |
| Muted text | `#94A3B8` | Captions only when contrast passes |
| Brand accent | `#60A5FA` | Controls and brand highlights |
| Link | `#93C5FD` | Readable links on dark background |
| Link hover | `#BFDBFE` | Link hover |
| Focus ring | `#60A5FA` | Focus outline |
| Border/divider | `#334155` | Separators and input borders |
| Disclaimer background | `#2A2112` | Muted amber surface |
| Disclaimer border/text | `#FBBF24` / `#FDE68A` | Accessible warning emphasis |
| Ad container | `#101827` | Slightly distinct from page background |
| Error | `#FCA5A5` | Dark-mode error text |
| Success | `#86EFAC` | Dark-mode success text |

Theme preference order: explicit user choice in `localStorage`, then operating-system preference, then light mode. Apply the resolved theme before first paint to avoid flashing. The toggle must expose state text such as “Switch to dark mode.”

## 6.4 Typography

### Font families

- **Headings:** Merriweather, with a suitable serif fallback stack.
- **Body and UI:** Inter, with a system sans-serif fallback stack.
- Use Google Fonts at the requested source during development. For production privacy/performance, self-hosting approved font files is preferable if licensing and project scope permit; otherwise preconnect and load only required weights.

### Type scale

| Style | Desktop | Mobile | Line height | Weight | Letter spacing |
|---|---:|---:|---:|---:|---:|
| H1 display | 48 px | 34–38 px | 1.15 | Merriweather 700/900 | -0.02em |
| H2 | 36 px | 28–30 px | 1.22 | Merriweather 700 | -0.015em |
| H3 | 26 px | 22–24 px | 1.30 | Merriweather 700 | -0.01em |
| H4 | 20 px | 19–20 px | 1.35 | Inter 700 or Merriweather 700 | 0 |
| Article body | 18 px | 17–18 px | 1.75 | Inter 400 | 0 |
| General UI/body | 16 px | 16 px | 1.60 | Inter 400 | 0 |
| Small/meta | 14 px | 14 px | 1.50 | Inter 500 | 0.01em |
| Caption/label | 12–13 px | 12–13 px | 1.45 | Inter 600 | 0.04em where uppercase |

- Headings use sentence case, not all caps.
- All-caps is limited to short labels such as “Advertisement,” with increased letter spacing.
- Body paragraphs target 55–75 characters per line.
- Bold is used for genuine emphasis, not entire paragraphs.
- Underlining is reserved primarily for links.

## 6.5 Spacing and layout system

Use a 4-pixel base unit with named spacing tokens:

- 4, 8, 12, 16, 24, 32, 40, 48, 64, 80, 96, and 120 pixels.
- Standard card padding: 24 pixels desktop; 20 pixels tablet; 16–20 pixels mobile.
- Section spacing: 80–96 pixels desktop, 56–64 pixels tablet, 40–48 pixels mobile.
- Grid gaps: 24–32 pixels desktop; 20–24 pixels tablet; 16–20 pixels mobile.
- Article paragraph spacing: approximately 1–1.25 line heights.
- Touch-target minimum: 44 by 44 pixels.
- Corner radius: 6–10 pixels for most controls/cards; Lawscope should not look excessively rounded.
- Shadow: very subtle default, with a modest lift on hover; borders remain visible when shadows disappear in high-contrast contexts.

## 6.6 Component specifications

### Article Card

- 16:9 image at top; category badge, linked title, excerpt, metadata row, and Read More link below.
- Entire card may have a linked overlay only if nested controls remain valid; otherwise link image and title and provide a clear final action.
- Equal-height layout on desktop, natural height on mobile.
- Default white/dark surface, one-pixel border, 8-pixel radius, restrained shadow.
- Hover: translate up approximately 2–3 pixels, scale no more than about 1.01, and slightly deepen shadow. Keyboard focus provides an equally visible non-motion state.
- Titles clamp only visually where needed; the full title remains available to assistive technology and on focus/hover where practical.

### Primary Button

- Deep navy background, white text, 600 weight, 12–16 pixel vertical and 18–24 pixel horizontal padding, 6–8 pixel radius.
- Hover uses darker navy; active state slightly reduces elevation.
- Focus uses a two- or three-pixel visible ring with offset.
- Disabled state uses reduced contrast but remains legible and exposes disabled semantics.

### Secondary Button

- Transparent or surface background, navy border/text in light mode and light-blue border/text in dark mode.
- Same size and focus treatment as primary.
- Hover uses a subtle tinted surface, not a full dramatic inversion.

### Form Inputs

- Visible label above every control; placeholders are examples, never the only label.
- Minimum 44-pixel control height, 16-pixel input text to avoid mobile zoom, clear border, surface background, and strong focus ring.
- Helper text precedes or accompanies errors. Error state includes icon/text and an `aria-describedby` relationship during implementation.
- Email autocomplete and correct input types are required.

### Category Tag/Badge

- Compact pill or softly rounded rectangle, 12–13 pixel semibold text.
- Light tinted background and accessible text color.
- Category name is always displayed; color/icon never carries meaning alone.
- On cards it links to the category page; in an article header it remains visually subordinate to H1.

### Breadcrumb

- 14-pixel UI text in a horizontally wrapping list.
- Separators are decorative and hidden from screen readers.
- Links are underlined on hover/focus; current page is text, not a link.
- Do not truncate the only accessible label.

### Search Bar

- Labeled input with search icon, clear button when populated, optional keyboard shortcut hint on desktop, and close button when expanded.
- Results panel shows up to an initial set with title, category, and date; announces count changes and supports arrows/Escape/Enter.
- Search operates on a prebuilt lightweight index and tolerates title/tag/category/excerpt matches.
- Empty and loading states are explicit.

### Cookie/Consent Banner

- Appears as a bottom panel or compact modal according to jurisdiction and consent requirements.
- Includes concise purpose text, Accept All, Reject Non-Essential, and Manage Choices with equal visual access; no deceptive color hierarchy.
- Essential storage is explained separately. Analytics/advertising do not run before consent where consent is required.
- Preference center is always reachable from the Privacy Policy/footer.
- Must not overlap the mobile navigation, back-to-top button, form errors, or ad controls.

### Back-to-Top Button

- Circular or compact rounded control fixed near the lower-right after approximately one viewport of scrolling.
- 44-pixel minimum target, visible icon plus accessible label, high-contrast focus state.
- Smooth scrolling is disabled when reduced motion is requested.

### Newsletter Section

- Distinct but calm brand-tinted surface, max-width content, headline and copy beside or above a short form.
- Desktop form can be inline; mobile form stacks.
- Success replaces or clearly updates the form without shifting the entire page unexpectedly.
- No prechecked marketing consent; privacy link remains adjacent.

### Share Buttons

- Native icon plus accessible platform name; icon-only visual treatment is acceptable only with programmatic labels/tooltips.
- No third-party tracking scripts. Open a share URL or system share sheet on user action.
- Copy Link announces “Link copied” in a live region and provides a fallback if clipboard access fails.

### Dark-Mode Toggle

- Sun/moon visual plus accessible state text.
- Minimum 44-pixel target.
- Updates `aria-pressed` or an equivalent state and saves explicit preference.
- Icons do not rotate continuously or animate excessively.

### Ad Slot Container

- Subtle `#F8F9FA` light-mode or dark ad surface, thin border, reserved minimum dimensions, and centered content.
- “Advertisement” label appears above in small uppercase UI text.
- A collapsed/empty ad slot must not leave a large blank area after the ad provider reports no fill.
- Ads remain separate from card grids and never inherit article-card styling.

### Legal Disclaimer Box

- Amber-tinted background, left border or full subtle border, small “Legal information notice” heading, exact required text, and link to full disclaimer.
- Placed after every article body and optionally near high-risk article intros when editorially justified.
- It must be prominent without using alarming hazard imagery.

### Reading Time + Date Meta Bar

- Compact, wrapping row with author, published date, optional updated date, and reading time.
- Use text labels and subtle separators; never rely solely on icons.
- Secondary color that still passes contrast. Last updated is shown only for substantive revisions.

## 6.7 Animation and motion

- Card hover: 2–3 pixel upward translation, scale at or below 1.01, and subtle shadow lift.
- Scroll reveal: opacity from 0 to 1 and vertical translation of about 12–16 pixels, typically 250–400 milliseconds.
- Buttons, links, input borders, and theme colors: approximately 0.2 seconds ease.
- Mobile menu: short opacity/slide transition with focus management; content remains usable without animation.
- No parallax, bouncing controls, autoplay, flashing, or long entrance sequences.
- Under `prefers-reduced-motion: reduce`, remove smooth scrolling, transforms, and non-essential transitions; content is immediately visible.

---
# 7. SEO Plan

## 7.1 Search strategy principles

Lawscope is a legal-information publication in a high-trust, “Your Money or Your Life” subject area. SEO must follow editorial quality rather than attempt to manufacture authority. Pages should answer a defined informational intent, state limits, cite current sources, and avoid promises such as “win your case,” “guaranteed rights,” or “complete legal answer.”

No page should be published solely to target a keyword. State-specific pages should not be generated until Lawscope can accurately research and maintain each jurisdiction.

## 7.2 Page titles

Use the format **[Page or Article Title] | Lawscope**. Keep most titles around 50–60 characters when practical; do not truncate meaning just to meet a character target.

| Page | Suggested title |
|---|---|
| Home | Plain-English U.S. Legal Information \| Lawscope |
| Law Articles | U.S. Law Articles & Legal Guides \| Lawscope |
| Categories | Legal Topics & Categories \| Lawscope |
| About | About Our Editorial Mission \| Lawscope |
| Contact | Contact \| Lawscope |
| Privacy Policy | Privacy Policy \| Lawscope |
| Legal Disclaimer | Legal Disclaimer \| Lawscope |
| Supporting: Editorial Policy | Editorial Policy & Standards \| Lawscope |

Article default: **{Article Title} | Lawscope**. A custom SEO title may shorten or clarify the search title but must accurately match the article. Category default: **{Category Name} Articles & Guides | Lawscope**.

## 7.3 Meta descriptions

All descriptions below are under 155 characters. The build must enforce the maximum and warn against duplicates.

| Page | Suggested meta description |
|---|---|
| Home | Understand U.S. law in plain English with carefully sourced guides on rights, legal processes, and everyday legal questions. |
| Law Articles | Browse clear, educational U.S. law articles by topic, with visible dates, sources, disclaimers, and practical context. |
| Categories | Explore U.S. legal information by category, from criminal and family law to employment, consumer rights, and legal news. |
| About | Learn how Lawscope researches, writes, sources, updates, and corrects plain-English educational information about U.S. law. |
| Contact | Contact Lawscope about corrections, accessibility, privacy, advertising, topic suggestions, or general website questions. |
| Privacy Policy | Read how Lawscope collects, uses, protects, and shares data, including information about cookies, analytics, ads, and your choices. |
| Legal Disclaimer | Understand the limits of Lawscope’s educational legal information, including no legal advice or attorney-client relationship. |
| Supporting: Editorial Policy | Review Lawscope’s standards for legal sourcing, plain-English editing, updates, corrections, AI tools, and advertising independence. |

Article descriptions use the dedicated CMS meta-description field. Category descriptions should be distinct, category-specific, and not repeated from the page title.

## 7.4 Open Graph and Twitter cards

### Shared requirements

Every indexable public page includes:

- `og:title`: page-specific SEO/social title.
- `og:description`: page-specific description.
- `og:image`: absolute HTTPS URL to a 1,200 × 630 image.
- `og:image:alt`: concise description of that image.
- `og:url`: absolute canonical URL.
- `og:type`: `website` for institutional/listing pages; `article` for articles.
- `og:site_name`: `Lawscope`.
- `og:locale`: `en_US`.
- Twitter/X card type: `summary_large_image`.
- Twitter/X title, description, image, and image-alt values matching or appropriately shortening the Open Graph values.
- Twitter site/creator handles only after official accounts exist.

### Page-type mapping

- **Home:** Lawscope title/description, branded default social image, canonical root URL, `website`.
- **Articles library and Categories:** page-specific title/description, branded topic-library image, canonical listing URL, `website`.
- **Category:** category name/description and approved category or default image, canonical category URL, `website`.
- **Article:** custom SEO/social title, article meta description, featured image crop, article canonical URL, `article`; include article publication/modification times, section, and tags where supported.
- **About/Contact/legal/editorial pages:** page title/description, branded default image, canonical URL, `website`.
- **404/admin/drafts/previews:** no social optimization requirement; set noindex for admin and preview environments.

If a featured image cannot produce a safe social crop, use the branded default rather than a distorted or misleading image.

## 7.5 Heading structure

- Exactly one H1 per public page.
- Home H1 is the featured hero article title; “Featured Legal Guides” and later sections are H2.
- Listing/category pages use the page/category name as H1; card titles are H2 or H3 according to their containing section.
- Article template supplies the H1 from front matter. CMS body content starts at H2; H3 nests under H2 and H4 under H3.
- About, Contact, Privacy, Disclaimer, and Editorial Policy use the page name as H1, major sections as H2, and subsections as H3.
- Do not choose heading levels for visual size. Style classes/tokens control appearance.
- Ad labels, metadata, footer group titles, and buttons are not headings unless they introduce real sections.

## 7.6 SEO-friendly URLs

### Fixed routes

- `https://getlawscope.com/`
- `https://getlawscope.com/articles/`
- `https://getlawscope.com/categories/`
- `https://getlawscope.com/about/`
- `https://getlawscope.com/contact/`
- `https://getlawscope.com/privacy-policy/`
- `https://getlawscope.com/legal-disclaimer/`
- `https://getlawscope.com/editorial-policy/`

### Dynamic patterns

- Article: `https://getlawscope.com/articles/{descriptive-title-slug}/`
- Category: `https://getlawscope.com/categories/{approved-category-slug}/`
- Pagination: use a consistent crawlable pattern such as `/articles/page/2/` and category equivalents if volume requires it.

Rules: lowercase, ASCII hyphens, no stop-word stripping that makes a slug unclear, no file extensions in canonical public URLs, no query string as the canonical form, and no date folders. Old paths receive permanent redirects.

## 7.7 Canonical URLs

- Add one absolute self-referencing canonical link to every indexable page.
- Filtered, sorted, tracking-parameter, and share URLs canonicalize to the clean base/listing or appropriate paginated URL.
- Each article canonicalizes only to its final stable article route.
- Vercel preview and branch deployments use noindex and canonicalize cautiously to production only when the equivalent production page exists; previews must never enter the sitemap.
- Enforce a single host/protocol: HTTPS and either apex `getlawscope.com` or a chosen `www` host, with permanent redirects from alternatives. The current plan uses the apex.

## 7.8 XML sitemap

Use a build-generated sitemap at `/sitemap.xml` containing:

- Home and all seven primary public pages.
- Editorial Policy.
- All published category pages.
- All published article pages.
- Paginated listing pages only if they are canonical, useful crawl targets.

Exclude drafts, future posts, previews, filtered/search states, admin, 404, and private endpoints. Use each article’s substantive updated date for `lastmod`; do not rewrite every `lastmod` on every deployment. The build reads CMS front matter on each Vercel rebuild, validates canonical URLs, XML-escapes values, and updates the sitemap automatically. If the site later exceeds sitemap limits, emit a sitemap index with separate page/article files.

Submit the production sitemap in Google Search Console and Bing Webmaster Tools after domain verification.

## 7.9 Complete robots.txt content

```text
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://getlawscope.com/sitemap.xml
```

This file is crawl guidance, not access control. `/admin/` still requires authentication and an explicit noindex directive/header. Preview deployments should send a site-wide `noindex, nofollow` response header rather than relying on the production robots file.

## 7.10 Structured data/schema blueprints

Structured data must represent visible facts, use absolute canonical URLs, and be generated from the same validated content source as the page. It is not a ranking guarantee.

### Home: WebSite + Organization

**WebSite properties:** name (`Lawscope`), canonical URL, description, publisher reference, and optional SearchAction only if the search URL/action is real and supported.  
**Organization properties:** name, URL, text-logo/image URL, sameAs links for active official profiles, contact point for site/privacy inquiries when configured. Do not claim legal-service or law-firm schema.

### Article: Article + BreadcrumbList

**Article properties:** headline, description, featured image URL(s), datePublished, dateModified, mainEntityOfPage, articleSection, keywords/tags, wordCount, author, publisher, publisher logo, and canonical URL. Use `Organization` for “Lawscope Editorial” until real person profiles exist. Legal News articles may use a more specific news type only when they meet that type’s requirements.  
**BreadcrumbList items:** Home, category, article, each with name, position, and URL except the final URL where schema guidance permits either form.

### Category: CollectionPage

Properties: name, description, canonical URL, breadcrumb, publisher/about reference, and a main entity representing the visible article list where practical. Do not mark ordinary category pages as FAQ pages.

### About: AboutPage + Organization

AboutPage properties: name, description, URL, main entity reference to Lawscope Organization. Organization repeats consistent identity/logo/social/contact facts, not invented founder or credential data.

### Contact: ContactPage

Properties: name, description, URL, and about/publisher reference. ContactPoint information is included only when a real, monitored method and hours/availability are published.

### Legal pages: WebPage

Privacy Policy, Legal Disclaimer, and Editorial Policy use WebPage with name, description, URL, datePublished/dateModified where visible, breadcrumb, and publisher. Avoid unsupported “legal advice” or professional-service types.

### Validation

Run schema through Google’s Rich Results Test where applicable and Schema.org validation. Build checks should flag missing required content, invalid dates, relative images, and disagreement between visible byline/dates and structured data.

## 7.11 Internal linking

- Every article links to its primary category near the title and in breadcrumbs.
- End each article with three related articles from the same category, ranked by tag overlap and recency; manually curated relationships may override automation later.
- Add contextual links in body text only when they genuinely help the reader; use descriptive anchor text.
- Category pages cross-link to relevant neighboring topics.
- Home links to featured/latest articles, all categories, About, and the article library.
- Breadcrumbs appear on all inner public pages.
- Footer links to primary navigation, ten categories, Privacy, Disclaimer, Editorial Policy, and Contact.
- Periodically audit orphan pages, broken links, redirect chains, and overused exact-match anchors.

## 7.12 E-E-A-T trust signals

- Visible author name, publication date, and substantive last-updated date on every article.
- Source Citations section with authoritative, directly relevant links.
- Standard legal disclaimer on every article and full disclaimer in the footer.
- Detailed Editorial Policy with corrections, sourcing, advertising independence, and AI rules.
- About page with a truthful mission and publication identity.
- Clear Contact route for corrections and privacy/accessibility inquiries.
- Consistent organization identity in page content, metadata, and schema.
- No fabricated biographies, attorney badges, awards, reviews, or “expert reviewed” claims.
- Material corrections are made promptly and noted where the original error could have affected reader understanding.
- High-change articles are reviewed on a schedule; update dates never change solely for SEO freshness.

## 7.13 Keyword strategy by category

Keywords are themes for research and information architecture, not instructions to force repetition. Each article should target one primary intent and a small group of natural secondary concepts.

| Category | Primary themes | Secondary/supporting themes | Dominant intent |
|---|---|---|---|
| Criminal Law | criminal procedure, Miranda rights, arrest process, misdemeanor vs felony | booking, bail, arraignment, right to remain silent, charges vs conviction | Understand rights and court stages |
| Family Law | child custody, divorce process, child support | parenting plans, best interests, support modification, marital property, uncontested divorce | Understand family-court concepts |
| Business Law | LLC vs corporation, contract basics, small business law | registered agent, operating agreement, incorporation, consideration, business compliance | Compare structures and duties |
| Employment Law | at-will employment, overtime rules, workplace discrimination | FLSA exemptions, retaliation, reasonable accommodation, wage claims, protected classes | Understand workplace rights/processes |
| Personal Injury | negligence elements, insurance claim, injury deadlines | duty of care, causation, damages, adjuster, statute of limitations, comparative fault | Learn claim concepts and time sensitivity |
| Real Estate & Property Law | tenant rights, security deposits, title insurance, property disputes | lease terms, easements, deed, survey, landlord duties, closing | Understand property documents and responsibilities |
| Immigration Law | green card vs citizenship, visa overstay, asylum process | lawful status, naturalization, unlawful presence, removal proceedings, authorized legal help | Understand status/process while seeking qualified help |
| Consumer Law | debt collection rights, credit report dispute, warranties | FDCPA, FCRA, validation notice, identity theft, implied warranty, consumer complaint | Identify protections and official steps |
| Civil Rights | First Amendment, ADA accommodations, protest rights | government action, public forum, discrimination, constitutional rights, retaliation | Understand scope of protected rights |
| Legal News & Updates | Supreme Court decision explained, federal rulemaking, court injunction | majority opinion, dissent, final rule, effective date, TRO, appeal | Understand the meaning/status of developments |

Research should also identify question phrasing, vocabulary variants, official-source terminology, and state-law modifiers. Do not create near-duplicate articles for every keyword variation.

## 7.14 Performance SEO

- Generate article/category HTML at build time; do not require JavaScript for primary text, links, metadata, or navigation.
- Mobile-first responsive layouts and touch targets.
- Responsive, compressed images with dimensions; lazy-load below-the-fold images, but prioritize the likely Largest Contentful Paint hero image.
- Reserve ad and image dimensions to minimize Cumulative Layout Shift.
- Use minimal vanilla JavaScript, deferred by default; split search/CMS/admin behavior from public bundles.
- Minify production CSS/JS/HTML and eliminate unused Font Awesome/font weights.
- Cache fingerprinted static assets for a long duration; keep HTML revalidatable.
- Target Core Web Vitals at the 75th percentile: LCP within 2.5 seconds, INP within 200 milliseconds, and CLS at or below 0.1.
- Load analytics/ads according to consent and after critical editorial content.
- Use Vercel CDN, compression, HTTPS, HTTP/2 or newer protocol support, and regional monitoring.
- Test real mobile conditions, not only desktop Lighthouse.

---

# 8. Module Build Plan

Each module produces a reviewable increment. A module is complete only when its acceptance checks pass; visual completion alone is insufficient. No implementation begins before planning approval.

## Module 01 — Project Setup & Folder Structure

Create the GitHub repository, approved source tree, branch strategy, package/build metadata if needed, environment-variable inventory, Vercel project connection, and companion Netlify service proof of concept. Confirm clean URL strategy and build output.  
**Acceptance:** repository deploys a harmless shell; preview and production environments are distinct; no secrets are committed; Identity/Git Gateway feasibility is documented.

## Module 02 — CSS Variables & Base Reset

Define semantic color, spacing, radius, shadow, container, breakpoint, motion, and z-index custom properties for light/dark modes. Add a minimal accessible reset and consistent box sizing without hardcoded component colors.  
**Acceptance:** tokens cover the style guide; focus visibility and form inheritance survive the reset.

## Module 03 — Google Fonts & Base Typography

Load Merriweather and Inter with the smallest required weight set; establish responsive heading/body/meta styles, readable line lengths, fallback stacks, and font-display behavior.  
**Acceptance:** no invisible-text delay; typography remains usable with fonts blocked; body and heading hierarchy match the guide.

## Module 04 — Header & Navigation

Build the Lawscope text logo, desktop links, active states, expandable search control shell, theme control, and accessible mobile menu.  
**Acceptance:** full keyboard operation, focus containment/return for menu, Escape close, 44-pixel targets, no viewport overflow.

## Module 05 — Hero Section

Build the two-column/stacked CMS-driven featured article hero with category, H1, excerpt, reading time, date, action, and image. Define deterministic fallback to newest article.  
**Acceptance:** one H1, correct responsive order, image dimensions/alt, no duplicate hero item in featured grid.

## Module 06 — Featured Articles Grid

Build three reusable Article Cards populated from featured CMS entries.  
**Acceptance:** equal-height desktop cards, natural mobile flow, keyboard-visible links, graceful behavior with fewer than three eligible entries.

## Module 07 — AdSense Slot 1

Build the below-feature horizontal placeholder with label, reserved responsive size, feature flag, consent hook, and no-fill collapse behavior. Do not activate live ads.  
**Acceptance:** unmistakably separate from content, no material layout shift, hidden cleanly when disabled.

## Module 08 — Latest Articles Grid

Render six newest published entries, excluding duplicates where practical, with View All action.  
**Acceptance:** date sort is deterministic, drafts/future posts excluded, responsive card grid and empty-state handling.

## Module 09 — Popular Categories Grid

Build ten category tiles from controlled collection data with icon, name, description, and route.  
**Acceptance:** all approved slugs, icons decorative where appropriate, category names visible, accessible contrast.

## Module 10 — Newsletter Signup Section

Build the email form, consent/privacy copy, validation, loading, double-opt-in messaging, success/error states, and provider abstraction.  
**Acceptance:** no PII in URL/analytics/Git, keyboard and screen-reader usable, endpoint controlled by environment/settings.

## Module 11 — Footer

Build logo/tagline, primary links, category links, active social profiles, dynamic copyright, and policy links including Editorial Policy.  
**Acceptance:** inactive social links hidden; all links valid; layout works in four/two/one-column states.

## Module 12 — Dark Mode Logic

Implement system preference, explicit user choice in local storage, pre-paint application, accessible toggle state, and palette transitions.  
**Acceptance:** no theme flash under normal conditions, all components pass contrast in both modes, preference persists.

## Module 13 — Cookie Consent Banner

Implement consent banner/preference center integration, region-appropriate choices, analytics/ad blocking, and footer re-entry point. Prefer a Google-certified CMP where AdSense requires it.  
**Acceptance:** Reject Non-Essential is as usable as Accept; choices persist; no non-essential tag fires before required consent.

## Module 14 — Back-to-Top Button

Add threshold-based display, accessible label, safe viewport position, focus behavior, and reduced-motion handling.  
**Acceptance:** no overlap with consent banner or mobile controls; works with keyboard; hidden when unnecessary.

## Module 15 — Scroll Fade-In Animations

Add progressive-enhancement reveal behavior with an intersection observer and immediate visibility fallback.  
**Acceptance:** all content is visible without JavaScript; reduced-motion users receive no non-essential movement.

## Module 16 — Search Bar Functionality

Generate a lightweight search index from published content and implement title/category/tag/excerpt matching, accessible result announcements, clear/close actions, and keyboard navigation.  
**Acceptance:** drafts absent; usable without a mouse; fast on mid-range mobile; no indexable duplicate search pages.

## Module 17 — Law Articles Page

Build page intro, filter toolbar, result count, CMS-driven card library, empty state, pagination, ad insertion point, and newsletter.  
**Acceptance:** crawlable pagination, deterministic sorting, no client-only primary content, filters preserve accessible labels.

## Module 18 — Category Filters

Implement all-ten-category filtering with clear state, query/state behavior, result count, and reset.  
**Acceptance:** browser navigation behaves predictably; canonical strategy applied; category options derive from controlled data.

## Module 19 — Categories Overview Page

Build the ten-category overview, guidance panel, optional ad inventory, and newsletter.  
**Acceptance:** unique descriptions, correct routes, no ad between tiles at launch, responsive grid.

## Module 20 — Individual Category Page Template

Generate one page per category with breadcrumbs, category hero/count, optional featured item, article grid, pagination, in-feed ad, related categories, metadata, and CollectionPage schema.  
**Acceptance:** all ten pages build; only matching published articles appear; empty/few-entry states remain credible.

## Module 21 — Individual Article Page Template

Generate article pages with breadcrumbs, header metadata, image, body, optional table of contents/sidebar, mid-article ad, auto disclaimer, sources, tags, native share links, end ad, related cards, reading time, dates, Article/Breadcrumb schema, Open Graph, and back-to-top support.  
**Acceptance:** Markdown is sanitized and semantic; body cannot add a second H1; disclaimer cannot be removed; no current-article duplication; metadata matches visible facts.

## Module 22 — About Lawscope Page

Build About sections, mission, process, boundaries, publication identity, corrections callout, and newsletter. Build the closely related **Editorial Policy** trust page in this module to preserve the requested 33-module sequence.  
**Acceptance:** no invented credentials; Editorial Policy is footer-linked, dated, ad-free, and indexable.

## Module 23 — Contact Page & Form

Build form/guidance layout, input validation, spam protection, privacy consent, provider/serverless submission, status states, and correction workflow.  
**Acceptance:** no secrets client-side, no GA PII, errors are accessible, urgent/legal-advice boundary is prominent.

## Module 24 — Privacy Policy Page

Build dated, linked-table-of-contents policy layout and consent-preference access. Insert counsel-approved final language and service-provider details before launch.  
**Acceptance:** reflects actual data flows and retention; ad-free; mobile-readable; privacy contact works.

## Module 25 — Legal Disclaimer Page

Build full disclaimer document and ensure the exact short disclaimer appears automatically in every article component.  
**Acceptance:** exact required text, no article opt-out, full-page link works, ad-free.

## Module 26 — 404 Error Page

Build branded 404 with real 404 status, navigation, search, popular categories, and broken-link contact route.  
**Acceptance:** unknown routes return 404 rather than soft-404/200; page remains useful without ads.

## Module 27 — Netlify CMS Configuration

Configure admin shell and CMS configuration for Articles, Categories, and Settings; media paths; validations; previews; workflow; maintained Decap/Netlify CMS assets; and helpful field guidance.  
**Acceptance:** editor can draft, preview, and publish a sample; content lands in approved folders; required fields/build validation work.

## Module 28 — SEO Implementation

Implement title/description rules, Open Graph, Twitter cards, canonicals, heading audits, JSON-LD blueprints, noindex rules, redirects, and metadata fallbacks.  
**Acceptance:** unique metadata, absolute social images, valid schema, one H1, production/preview indexing behavior verified.

## Module 29 — XML Sitemap & robots.txt

Generate sitemap from fixed pages, categories, and published articles on every build; install the approved production robots content and preview noindex headers.  
**Acceptance:** no drafts/admin/404; valid XML; accurate lastmod; canonical host only.

## Module 30 — Google Analytics GA4 Integration

Add placeholder-to-production measurement ID, consent-aware page views, defined events, environment filters, and internal-traffic/testing guidance.  
**Acceptance:** DebugView verifies events; no email/message/PII captured; preview traffic excluded or separated.

## Module 31 — Google AdSense Integration

Add consent-aware AdSense loader and approved slot identifiers across home, listings, categories, and articles. Preserve feature flags and reserved space.  
**Acceptance:** every unit labeled; no ads on trust/contact/admin/404 pages; mobile density/policy review; no severe layout shift.

## Module 32 — Netlify Identity & Git Gateway Setup

Configure companion Netlify service, invite-only Identity, single editor, Git Gateway permissions, recovery, production origins, and documentation.  
**Acceptance:** unauthorized users cannot enter CMS; public signup disabled; publish triggers GitHub then Vercel; rollback/recovery tested.

## Module 33 — Final Integration, QA & Accessibility

Assemble all pages, replace placeholders as approved, run content/build validation, WCAG AA review, keyboard/screen-reader checks, responsive and cross-browser tests, Lighthouse/Core Web Vitals checks, broken-link/schema/social-preview tests, form/auth workflow tests, consent/ad/analytics tests, and launch checklist.  
**Acceptance:** no critical/high defects; 90+ Lighthouse target across representative templates where third-party scripts allow; documented exceptions and owner sign-off.

---

# 9. Technical Specifications

## 9.1 Technology stack

### Public site

- Semantic HTML5 for landmarks, headings, navigation, articles, dates, figures, forms, and footer.
- CSS3 with custom properties for all reusable colors, typography, spacing, widths, radii, shadows, timing, and z-index values. Avoid arbitrary component hardcoding.
- Vanilla JavaScript only for enhancements: navigation, theme, search, consent hooks, share/copy, forms, filters, analytics, and progressive animations.
- Merriweather for headings and Inter for body/UI.
- Font Awesome 6 from CDN as requested, loaded with integrity/cross-origin safeguards where available and limited to needed icons. Text labels/fallbacks preserve usability if the CDN fails.
- `picsum.photos` for development placeholders only; no production dependency.
- Local storage for explicit dark-mode preference and, if appropriate, non-sensitive UI choices.
- Netlify CMS/Decap CMS for Git-based editorial management.
- Netlify Identity and Git Gateway through the companion service for authentication/repository writes.
- Markdown content with validated front matter.
- A lightweight Markdown parser such as `marked` used during the build, with sanitization and heading rules.
- No Bootstrap, Tailwind, jQuery, or client-side application framework.

### Build-time rendering decision

“JavaScript reads and renders Markdown” will be implemented as a small **Node-based JavaScript build step**, not as browser-only rendering. The build reads `/content/`, parses front matter and Markdown, validates entries, and emits complete static article/category HTML. Public client JavaScript enhances the already rendered pages.

This is necessary because a browser cannot reliably enumerate a Git directory, and client-only Markdown would weaken indexing, sharing metadata, accessibility, no-JavaScript resilience, and performance. It remains a vanilla JavaScript, no-framework architecture.

## 9.2 Hosting and deployment

- **GitHub:** canonical source repository and content history.
- **Vercel:** primary production/preview builds, HTTPS, edge CDN, redirects/headers, and optional serverless form endpoint.
- **Netlify companion service:** Identity and Git Gateway only; it is not the public production origin.
- **Production branch:** protected; production deployment follows accepted commits/merges.
- **Preview branches:** Vercel preview deployments with noindex headers and no production analytics/ads.
- **Deployment:** atomic; a failed validation/build leaves the prior production version live.
- **Domain:** configure apex `getlawscope.com` after purchase, DNS verification, HTTPS issuance, host redirect, and Search Console verification.

### Publish flow

Editor opens `/admin` → authenticates → edits structured entry → saves draft or publishes → Git Gateway writes to GitHub → production-branch change triggers Vercel → build validates and generates complete static pages/search/sitemap → successful deployment becomes live.

### Build failure policy

A build should fail with an editor-readable message for duplicate slugs, missing required metadata, unknown categories, invalid dates, missing source/alt text, broken local media references, unsafe Markdown, or metadata over configured limits. Content warnings that do not affect correctness may be reported without failing, but launch criteria determine severity.

## 9.3 Source file and folder structure

The requested structure is retained and expanded only where static generation requires it:

```text
/
├── index.html                         Home source/template or generated entry
├── sitemap.xml                        Generated for production
├── robots.txt                         Production crawl rules
├── 404.html                           Host-level 404 output
├── vercel.json                        Clean routes, headers, redirects if required
├── package.json                       Build scripts and pinned lightweight tools
├── /admin/
│   ├── index.html
│   └── config.yml
├── /pages/
│   ├── articles.html                  Listing source/template
│   ├── categories.html                Overview source/template
│   ├── about.html
│   ├── contact.html
│   ├── privacy-policy.html
│   ├── legal-disclaimer.html
│   ├── editorial-policy.html          Required supporting trust page
│   ├── article-template.html
│   ├── category-template.html
│   └── 404.html
├── /css/
│   ├── main.css
│   ├── dark-mode.css
│   └── components.css
├── /js/
│   ├── main.js
│   ├── dark-mode.js
│   ├── search.js
│   ├── cms-render.js                  Shared content helpers/build-compatible logic
│   └── analytics.js
├── /scripts/
│   ├── build-content.mjs              Static content generator
│   ├── validate-content.mjs           Editorial/metadata checks
│   └── generate-search-index.mjs      Published-content index
├── /content/
│   ├── /articles/
│   │   └── (Markdown files from CMS)
│   ├── /categories/
│   │   └── (category Markdown files)
│   └── settings.yml                   Singleton non-secret settings
├── /assets/
│   ├── /images/                       CMS uploads and optimized derivatives/source
│   └── /icons/
└── /generated/                        Build output, not hand-edited or committed if excluded
    ├── /articles/{slug}/index.html
    ├── /categories/{slug}/index.html
    └── search-index.json
```

The exact output-directory name may be adjusted for Vercel, but source and generated content must remain clearly separated. Generated artifacts are never edited through CMS.

## 9.4 Content rendering and routing

- Parse YAML front matter and Markdown at build time.
- Sanitize or reject unsafe raw HTML and unsupported embeds.
- Convert only valid heading hierarchy; template controls H1.
- Generate one route per published article and category, complete with metadata and schema.
- Generate article-card data, category counts, related-article selections, reading time, search index, and sitemap from the same content graph.
- Use deterministic sort order: publication date descending, then title/slug as tie-breaker.
- Use clean trailing-slash URLs with Vercel rewrites/redirects as needed.
- Set permanent redirects when an approved slug changes.
- Do not fetch raw Markdown in the browser for primary content. A small JSON search index is the only planned browser content data file.

## 9.5 Public JavaScript behavior

- All scripts deferred or modules loaded after parsing unless a tiny pre-paint theme initializer is required.
- Site navigation and content links work without JavaScript.
- Search, filters, share/copy, enhanced forms, theme, back-to-top, and animations progressively enhance the page.
- If search JavaScript fails, users can still browse Articles and Categories.
- Third-party analytics/ads load through consent and feature flags, not unconditionally.
- Avoid global event handlers, memory leaks, long tasks, and layout-thrashing scroll listeners.

## 9.6 Performance targets and budgets

### Targets

- Lighthouse: 90+ for Performance, Accessibility, Best Practices, and SEO on representative Home, listing, category, article, and contact pages, acknowledging controlled impact from approved third-party ad scripts.
- Core Web Vitals at the 75th percentile: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Fast first response through Vercel CDN and static generation.

### Initial budgets

- Keep critical CSS compact and total public custom JavaScript modest; establish measured numeric budgets in Module 01 after tooling choice.
- Limit font families to two and load only required weights/styles.
- No above-the-fold lazy loading for the LCP image; below-the-fold images use native lazy loading.
- All images have width/height and responsive sources.
- Reserve ad dimensions and collapse no-fill slots safely.
- Cache hashed assets long-term; compress text responses; avoid unnecessary third-party origins.
- Use preconnect only for origins actually needed after consent; excessive resource hints are prohibited.

## 9.7 Accessibility requirements

Target WCAG 2.2 AA where applicable.

- Semantic landmarks with one main region and logical headings.
- Skip link to main content.
- Complete keyboard navigation with no traps, including menu, search, filters, forms, consent, and share controls.
- Visible focus indicators in both themes.
- Text/background and non-text contrast at AA minimum; test all hover, disabled, error, tag, and ad-label states.
- Alt text required for meaningful images; decorative icons hidden appropriately.
- Form labels, instructions, autocomplete, field-level errors, error summary, and status announcements.
- ARIA used only where native semantics are insufficient; every interactive icon has an accessible name.
- Target size of at least 44 by 44 pixels for primary touch controls.
- Reduced-motion support and no flashing content.
- Zoom to 200% and text resize without loss; reflow at 320 CSS pixels.
- Responsive tables, descriptive link text, language declaration, and understandable date formats.
- Captions/transcripts required if audio/video is added later.
- Test with automated tools plus keyboard and at least representative screen-reader checks; automation alone is insufficient.

## 9.8 Browser and device support

- Latest stable and previous major versions of Chrome, Firefox, Safari, and Edge at launch.
- Current iOS Safari and Android Chrome, with responsive behavior from approximately 320 pixels upward.
- Progressive enhancement for non-critical features; core content and navigation remain available when APIs such as Clipboard, Web Share, Intersection Observer, or local storage are unavailable/restricted.
- Test light/dark modes, reduced motion, zoom, touch, keyboard, and slow connections.

## 9.9 AdSense placement specification

| Location | Format | Rules |
|---|---|---|
| Home below featured content | Responsive horizontal banner | Launch unit; labeled; reserved space; not directly attached to CTA |
| Articles library | Full-row in-feed unit after about six cards | Must not look like a card; omitted in empty/small result sets |
| Category page | Full-row unit after first article group | Only when sufficient editorial content exists |
| Article mid-body | Responsive in-article unit | Insert only at approved H2 boundary after substantial content |
| Article sidebar | Desktop display unit | Omitted below desktop breakpoint; no obstructive sticky behavior |
| Article end | Responsive unit before related articles | Clear spacing and label |

No ads on About, Contact, Privacy Policy, Legal Disclaimer, Editorial Policy, 404, or Admin at launch. Ads are disabled on preview environments and before required consent. The owner must verify current AdSense placement, content, invalid-traffic, and consent policies before activation.

## 9.10 Google Analytics 4

### Configuration

- Placeholder measurement ID in non-production settings; real ID in approved environment/config only.
- Consent-aware initialization and regional behavior.
- Production and preview traffic separated; internal/editor traffic filtered where practical.
- Data retention and Google Signals/advertising features configured to match the final Privacy Policy and consent choices.
- Never send names, email addresses, message text, article-form content, full IP data controlled outside Google defaults, or other PII in event parameters.

### Events

- Standard page view on public pages.
- `newsletter_signup` only after confirmed successful submission; no email parameter.
- `contact_form_submit` only after success; subject may be reported only as a coarse non-sensitive category.
- `article_read` at a documented engagement threshold, such as sufficient time plus scroll depth; avoid counting accidental page loads.
- `category_click` with normalized category slug.
- Optional `search` with privacy-reviewed, sanitized query handling; avoid collecting queries that may contain sensitive personal facts.
- Optional outbound source click and share method if useful and disclosed.

Document each event name, trigger, parameters, consent category, and test procedure in an analytics measurement plan.

## 9.11 Privacy, consent, and security

- Final Privacy Policy must match actual vendors, cookies, retention, state-law choices, and data flows.
- Use HTTPS only, secure headers, a restrictive Content Security Policy compatible with approved CMS/AdSense/GA/font resources, referrer policy, permissions policy, MIME sniffing protection, and clickjacking protection where applicable.
- Admin must not be framed, indexed, or publicly registered.
- Sanitize Markdown and form output; validate on server/provider as well as client.
- Protect forms with rate limits, honeypot or accessible challenge, CSRF controls where applicable, and abuse monitoring.
- Keep secrets in environment variables; public CMS settings store only public identifiers.
- Minimize dependencies, pin versions, review updates, and run dependency/security checks.
- Do not expose GitHub tokens or newsletter API secrets to browser code.
- Do not store contact messages or subscriber PII in Git.
- Define incident response, credential rotation, content rollback, and privacy-request procedures before launch.

## 9.12 Editorial quality controls

Before an article can publish, verify:

1. The title and excerpt accurately describe scope.
2. Federal/state/local jurisdiction is clear.
3. Every legal proposition that needs support has a current, directly relevant source.
4. Cases are characterized by procedural posture and holding, not headline shorthand.
5. Allegations and convictions are not conflated.
6. Deadlines are not stated without jurisdiction/date/source and a warning to confirm.
7. No sentence predicts a reader’s legal outcome or tells the reader that general content is sufficient.
8. Publication/updated dates and author are truthful.
9. Image rights, relevance, and alt text are acceptable.
10. Metadata, canonical, schema, links, disclaimer, and source list pass validation.

## 9.13 QA and launch acceptance

### Functional

- All fixed/dynamic routes, filters, pagination, search, forms, share links, theme, menu, consent, and back-to-top behavior work.
- CMS login/draft/preview/publish/delete recovery is tested with the actual editor account.
- A CMS publish triggers a successful Vercel rebuild and appears live only when intended.

### Content and SEO

- Thirty planned articles are placeholders only; launch content quantity is an owner/editorial decision, but every live article must be original and complete.
- No filler, broken citations, duplicate titles/descriptions, orphan articles, accidental drafts, or placeholder IDs/images remain.
- Robots, sitemap, canonical, redirects, 404 status, metadata, and schema validate.

### Accessibility and visual

- WCAG AA checks, keyboard paths, screen-reader landmarks/forms, contrast, zoom/reflow, reduced motion, and both themes pass representative testing.
- Layout tested at common mobile, tablet, laptop, and wide-desktop widths.

### Performance and resilience

- Lighthouse targets checked before and after third-party tags.
- Core pages work with JavaScript blocked except enhancement-only features.
- Font, icon, image, analytics, ad, form-provider, and newsletter-provider failures degrade safely.

### Compliance and business readiness

- Domain ownership, organization/contact identity, privacy/disclaimer/editorial text, consent platform, GA4, newsletter provider, AdSense approval, and source/image rights are confirmed.
- Policy language receives appropriate legal/privacy review; this planning document is not itself legal advice.
- Backup, rollback, account recovery, and incident contacts are documented.

## 9.14 Key risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Netlify Identity/Git Gateway interoperability or product change | CMS login/publishing blocked | Validate in Module 01; maintain approved Git-backed auth fallback |
| Browser-only Markdown harms SEO | Poor indexing/sharing/performance | Build-time static generation as specified |
| Legal content becomes outdated | Reader harm and trust/search loss | Source policy, visible dates, review calendar, corrections workflow |
| Single-editor account loss | Publishing outage | Named recovery owner, MFA where available, tested recovery, repository backup |
| Ad/analytics scripts degrade speed or privacy | CWV and compliance issues | Consent gating, feature flags, reserved space, before/after monitoring |
| Subscriber PII placed in Git | Privacy/security incident | Dedicated newsletter provider; no subscriber collection in CMS repository |
| Random placeholder images reach production | Brand, privacy, and metadata inconsistency | Launch check blocks `picsum.photos` and unapproved remote assets |
| Invented authority signals | Severe trust/reputation risk | No unverified credentials/review badges; truthful Organization authorship |
| State-law pages scaled too quickly | Thin or inaccurate content | Publish only jurisdictions Lawscope can research and maintain |

## 9.15 Approval gate

Approval of this document authorizes Phase 2 planning-to-build transition. It does not approve final legal copy, activate tracking/advertising, purchase a domain, or authorize publication of placeholder article titles as completed legal guidance. Those items retain their individual review gates.

✅ Lawscope Planning Document Complete.
Review all sections above carefully.
Request any changes before we proceed.
Type APPROVED to begin Phase 2 — Build.
