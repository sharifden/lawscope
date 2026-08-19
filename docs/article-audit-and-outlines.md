# Article Audit & Rewrite Outlines — getlawscope.com

Prepared for: The GetLawscope Team
Date: 19 August 2026
Scope: audit + outlines only. **No article body text was written or changed.**

---

## PART A — AUDIT

| # | File | Title | Words | H1 | Meta | Schema | Canonical | Internal | External | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `content/articles/what-happens-after-an-arrest.md` | What Happens After an Arrest? A Plain-English Guide to the First Steps | 1,929 | ✅ | ✅ | ✅ | ✅ | 11 | 3 | **EXPAND** |
| 2 | `content/articles/choosing-llc-or-corporation.md` | Choosing Between an LLC and a Corporation | 662 | ✅ | ✅ | ✅ | ✅ | 10 | 2 | **REWRITE** |
| 3 | `content/articles/uscis-notices-types-and-response-basics.md` | USCIS Notices: Common Types and Response Basics | 605 | ✅ | ✅ | ✅ | ✅ | 10 | 2 | **REWRITE** |
| 4 | `content/articles/how-to-read-a-court-decision.md` | How to Read a Court Decision: A Plain-English Framework | 602 | ✅ | ✅ | ✅ | ✅ | 10 | 2 | **REWRITE** |
| 5 | `content/articles/at-will-employment-meaning-and-limits.md` | At-Will Employment: What It Means—and What It Does Not Mean | 596 | ✅ | ✅ | ✅ | ✅ | 10 | 3 | **REWRITE** |
| 6 | `content/articles/security-deposits-common-rules.md` | Security Deposits: Common Tenant and Landlord Rules | 582 | ✅ | ✅ | ✅ | ✅ | 10 | 2 | **REWRITE** |
| 7 | `content/articles/reasonable-accommodation-requests.md` | Reasonable Accommodation Requests: Documenting the Process | 574 | ✅ | ✅ | ✅ | ✅ | 10 | 2 | **REWRITE** |
| 8 | `content/articles/child-custody-orders-common-factors.md` | Child Custody Orders: Factors Courts Commonly Consider | 571 | ✅ | ✅ | ✅ | ✅ | 10 | 2 | **REWRITE** |
| 9 | `content/articles/disputing-credit-report-errors.md` | Disputing Errors on a Credit Report: Core Steps | 547 | ✅ | ✅ | ✅ | ✅ | 10 | 2 | **REWRITE** |
| 10 | `content/articles/preserving-evidence-after-an-injury.md` | Preserving Evidence After an Injury: A Practical Checklist | 538 | ✅ | ✅ | ✅ | ✅ | 10 | 2 | **REWRITE (priority)** |

**Column notes**
- *Words* — Markdown body only; navigation, footer and front-matter excluded.
- *Meta* — unique title, unique description ≤155 chars, 12 Open Graph tags, 5 Twitter Card tags.
- *Schema* — Article + BreadcrumbList + Organization JSON-LD.
- *Internal* — internal links on the rendered page (breadcrumb + related-articles + category). **In-body contextual links: 0 on every article** — addressed in Module 7.
- *External* — authoritative `.gov` / `.edu` citations in the Sources block.

### Audit findings

1. **Structural health: 10/10 pass.** Every article has exactly one H1, unique metadata, canonical, full social tags, and three JSON-LD types. Nothing to fix structurally.
2. **Thin content is the single real problem.** Nine of ten sit at 538–662 words. Median 589. For YMYL legal topics, competitive pages run 1,500–2,500 words.
3. **Zero in-body contextual links.** All internal linking is template chrome (breadcrumb, related cards). Module 7 adds body links.
4. **Citations are good but shallow.** 2–3 authoritative sources each; all `.gov`/`.edu`. Target 4–6 after rewrite.
5. **No FAQ sections anywhere.** Costs you People-Also-Ask visibility and FAQ rich results.
6. **Only one article is on-niche.** With Personal Injury as the flagship, #10 is the sole PI article and the shortest on the site. **Rewrite it first.**
7. **No update dates.** Every article shows `dateModified == datePublished`. Set `updated_date` when you rewrite — freshness matters in YMYL.

---

## PART B — STRUCTURAL FIXES

**Required state:** meta tags · canonical · Article JSON-LD · BreadcrumbList JSON-LD · exactly one H1.

**Result: all 10 articles already compliant. No changes were needed.**

Verified against the built output:

```
at-will-employment-meaning-and-limits    h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
child-custody-orders-common-factors      h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
choosing-llc-or-corporation              h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
disputing-credit-report-errors           h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
how-to-read-a-court-decision             h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
preserving-evidence-after-an-injury      h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
reasonable-accommodation-requests        h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
security-deposits-common-rules           h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
uscis-notices-types-and-response-basics  h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
what-happens-after-an-arrest             h1=1  og=12  tw=5  canonical=1  schema=Article+Breadcrumb+Org
```

Delivered in earlier modules: title tags trimmed to ≤60 chars via `seo_title` (Module 3), author identity set to The GetLawscope Team (Module 3), breadcrumbs re-pointed to the new hubs (Module 5).

---

## PART C — REWRITE OUTLINES

### How to use these

- Keyword targets are **long-tail and practical**. You will not out-rank national law firms on "personal injury claim". You can rank on "what to photograph after a car accident".
- Every outline says *what to cover*, never *what to write*. The words must be yours.
- Keep the existing discipline: no legal advice, no claim-value estimates, no "we are lawyers", always "check your state's rules".
- Set `updated_date` in front-matter when you publish a rewrite.
- Suggested titles are ≤60 characters including ` | Lawscope`, so they fit the enforced build limit.

---

## Article 1: Preserving Evidence After an Injury: A Practical Checklist
**⭐ REWRITE THIS FIRST — it is your only Personal Injury article and your shortest page.**

### Suggested New Title: What to Do After an Injury: Evidence Checklist
### Target Word Count: 2,000+
### Target Keyword: what evidence to collect after an injury
### Secondary: what to photograph after an accident · how long to keep accident records

### Outline:
1. **Introduction** (150–200 words)
   - Hook: evidence disappears fast — a wet floor is mopped within the hour, a bruise fades in a week, a store's camera loop overwrites in 30 days.
   - What this article covers: the first 48 hours, the first month, and what to keep long-term.
   - State clearly: this is general information, not advice about a specific claim.

2. **H2: The First 24 Hours: What Disappears Fastest**
   - Scene conditions, vehicle positions, weather, lighting, spills, ice, missing signage.
   - Names and phone numbers of witnesses before people leave.
   - Getting medical attention documented on the day — the record is the evidence.
   - Link to: [What Happens After an Arrest](/articles/what-happens-after-an-arrest/) if police attended.

3. **H2: How to Photograph an Accident Scene**
   - Wide shot, mid shot, close-up — the three-distance rule.
   - Photograph what caused it, not only the damage.
   - Include a scale reference; keep original files with intact metadata.
   - Photograph visible injuries on a schedule (day 1, 3, 7, 14) as they change.

4. **H2: Records to Request, and Who Holds Them**
   - Police or incident report — which agency, how to request, typical wait.
   - Medical records and itemised bills; the difference between a summary and full chart.
   - Employer records if work time was lost.
   - Property or premises records: maintenance logs, inspection sheets, CCTV retention windows.

5. **H2: Communications: What to Keep and What to Be Careful About**
   - Keep texts, emails, voicemails, claim-portal messages, app notifications.
   - Recorded statements: what a request usually means and why people often ask for time.
   - Social media: why posts and privacy settings can matter.
   - Never alter or delete; preserve as-is.

6. **H2: Tracking Financial Effects Over Time**
   - A simple running log: date, expense, purpose, receipt reference.
   - Mileage to appointments, prescriptions, equipment, home help, missed shifts.
   - Why contemporaneous notes generally carry more weight than later reconstruction.

7. **H2: Deadlines Vary — and They Are Unforgiving**
   - Statutes of limitations differ by state and claim type.
   - Shorter notice deadlines can apply to claims involving a government body.
   - Insurance policies may impose their own reporting windows.
   - Direct readers to their state's rules and to qualified help. **Do not state a specific number of years.**

8. **H2: Frequently Asked Questions**
   - Q1: How long should I keep records after an injury?
   - Q2: Do photos from a phone count as evidence?
   - Q3: Should I give a recorded statement to an insurance company?
   - Q4: What if I did not go to a doctor on the day it happened?
   - Q5: Can I still document things weeks later?

9. **H2: Conclusion**
   - Recap the three-bucket model: scene, records, money.
   - CTA: read the Personal Injury hub and the related guides.

### Internal Links to Include:
- [Personal Injury hub](/categories/personal-injury/)
- [What Happens After an Arrest](/articles/what-happens-after-an-arrest/)
- [How to Read a Court Decision](/articles/how-to-read-a-court-decision/)
- [Disputing Errors on a Credit Report](/articles/disputing-credit-report-errors/) — medical debt on a credit report

### External Links to Include:
- U.S. Courts — Federal Rules of Evidence
- USA.gov — Find a Lawyer and Affordable Legal Aid
- CDC — Injury Prevention & Control (documenting injuries)
- Your state's judicial branch self-help centre (as an example of where to look)

### Notes:
- This is the flagship article of your flagship hub. Give it the most effort of all ten.
- A printable checklist section is highly linkable and shareable — strong candidate for Pinterest.
- Never estimate what a claim is worth. That is the fastest way to look like an unlicensed advice site.

---

## Article 2: What Happens After an Arrest?
**Already 1,929 words — your strongest page. EXPAND, do not rewrite from scratch.**

### Suggested New Title: What Happens After an Arrest: Step-by-Step
### Target Word Count: 2,500+
### Target Keyword: what happens after an arrest step by step
### Secondary: how long can police hold you before charges · what happens at a first court appearance

### Outline:
1. **Introduction** — keep the existing "arrest begins a process, it does not decide guilt" framing. It is genuinely good.
2. **H2: Arrest and Custody** — existing, keep.
3. **H2: Questions, Silence, and Requesting a Lawyer** — existing, expand with how a request is typically made in plain words.
4. **H2: Transport and Booking** — existing; add typical timing ranges and that they vary.
5. **H2: Charging Decisions** — existing; expand on prosecutor discretion vs police charges.
6. **H2: The First Court Appearance** — existing; expand on what actually happens in the room.
7. **H2: Bail, Release, and Detention** — existing; expand — highest-search subtopic on this page.
8. **NEW H2: State vs Federal Cases: Why the Path Differs** — different courts, different timelines, different terminology.
9. **NEW H2: What Families Can Do in the First 48 Hours** — locating the person, court dates, what a lawyer will ask for. High-empathy, high-traffic section.
10. **H2: Records and Longer-Term Effects** — existing; expand on expungement/sealing existing by state, without giving procedure.
11. **NEW H2: Frequently Asked Questions**
    - Q1: How long can someone be held before seeing a judge?
    - Q2: What is the difference between bail and bond?
    - Q3: Does an arrest show up on a background check if charges are dropped?
    - Q4: Can someone be arrested without being told why?
    - Q5: What happens if a first court date is missed?
12. **H2: Conclusion + Questions to Ask a Lawyer** — existing, keep.

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [How to Read a Court Decision](/articles/how-to-read-a-court-decision/)
- [Preserving Evidence After an Injury](/articles/preserving-evidence-after-an-injury/) — if injured during the incident

### External Links to Include:
- U.S. Courts — Criminal Cases
- Cornell LII — Arrest · Cornell LII — Initial Appearance
- Bureau of Justice Statistics — pretrial release data
- National Association of Criminal Defense Lawyers — public resources

### Notes:
- Do not restart this one. Add the three new H2s and deepen bail + first appearance.
- Bail terminology varies enormously by state — say so explicitly rather than picking one system.

---

## Article 3: Choosing Between an LLC and a Corporation

### Suggested New Title: LLC vs Corporation: How to Choose a Structure
### Target Word Count: 1,800+
### Target Keyword: llc vs corporation which is better for a small business
### Secondary: difference between llc and s corp · do i need a corporation to raise investment

### Outline:
1. **Introduction** (150–200 words) — Hook: most people ask "which is better" when the answerable question is "which fits how this business will actually operate."
2. **H2: The Four Questions That Decide It** — who owns it · how profits are taxed · who is investing · how much paperwork you will tolerate.
3. **H2: Ownership and Management Compared** — existing content, expand into a comparison table.
4. **H2: Where Liability Protection Actually Stops** — personal guarantees, personal wrongdoing, commingling funds, failure to maintain the entity.
5. **H2: Tax Classification in Plain English** — default treatment vs elections; why "S corp" is a tax election, not an entity type. Common misconception, high search volume.
6. **H2: If You Plan to Raise Money** — why investors expect familiar corporate structures.
7. **H2: Ongoing Compliance and What It Costs You in Time** — annual reports, registered agent, records, meetings.
8. **H2: Frequently Asked Questions**
   - Q1: Can an LLC be taxed as an S corporation?
   - Q2: Which is cheaper to set up and maintain?
   - Q3: Can I change from an LLC to a corporation later?
   - Q4: Do I need a lawyer to form either one?
9. **H2: Conclusion** — decision checklist; talk to a tax professional about your actual numbers.

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [At-Will Employment](/articles/at-will-employment-meaning-and-limits/) — once you hire
- [Disputing Errors on a Credit Report](/articles/disputing-credit-report-errors/) — business vs personal credit

### External Links to Include:
- SBA — Choose a Business Structure
- IRS — Business Structures · IRS — S Corporation election (Form 2553 guidance)
- Your Secretary of State's business filing portal (as an example)

### Notes:
- A comparison table earns featured snippets on this exact query pattern.
- Never state which is "better" — state which fits which situation.

---

## Article 4: USCIS Notices: Common Types and Response Basics

### Suggested New Title: USCIS Notices Explained: Types and Deadlines
### Target Word Count: 1,800+
### Target Keyword: what does a uscis notice mean
### Secondary: what is a request for evidence · uscis notice of intent to deny meaning

### Outline:
1. **Introduction** — Hook: the form number in the corner tells you more than the title does.
2. **H2: How to Read Any USCIS Notice** — where the form number, receipt number, notice date and deadline sit; why the printed text controls.
3. **H2: Receipt and Account Notices** — existing, expand.
4. **H2: Appointment and Biometrics Notices** — existing, expand with rescheduling caution.
5. **H2: Requests for Evidence (RFE)** — biggest subtopic; expand substantially. What an RFE is, what it is not, why the deadline is strict.
6. **H2: Notices of Intent to Deny or Revoke** — existing, expand.
7. **H2: Approval, Denial, and Transfer Notices** — existing.
8. **H2: Keeping Your Address Current** — obligation exists, consequences of failure.
9. **H2: Avoiding Immigration Scams** — who may legally give immigration advice; "notario" warning. High-value trust section.
10. **H2: Frequently Asked Questions**
    - Q1: How long do I have to respond to an RFE?
    - Q2: Is a Notice of Intent to Deny the same as a denial?
    - Q3: What happens if I miss a biometrics appointment?
    - Q4: Can I check my case status online?
11. **H2: Conclusion** — verify everything on uscis.gov; individualised help matters here more than almost anywhere.

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [How to Read a Court Decision](/articles/how-to-read-a-court-decision/) — for immigration court decisions
- [Reasonable Accommodation Requests](/articles/reasonable-accommodation-requests/) — disability accommodations in the process

### External Links to Include:
- USCIS — Filing Guidance · USCIS — Tools · USCIS — Avoid Scams
- EOIR — Immigration Court information
- USA.gov — Immigration help

### Notes:
- Highest-stakes topic on the site. Deadlines and consequences are severe.
- Do **not** state specific response windows as fact — they vary by notice and change. Say "the notice states the deadline; follow it exactly."

---

## Article 5: How to Read a Court Decision

### Suggested New Title: How to Read a Court Decision (Beginner's Guide)
### Target Word Count: 1,600+
### Target Keyword: how to read a court opinion
### Secondary: what is a holding in a case · how to brief a case

### Outline:
1. **Introduction** — Hook: a court decision is written for other lawyers; here is the order to read it in so it makes sense.
2. **H2: Confirm What You Are Actually Holding** — opinion vs order vs judgment vs docket entry.
3. **H2: Which Court Decided It, and Does It Bind Anyone?** — trial vs appellate vs supreme; binding vs persuasive; state vs federal.
4. **H2: Decoding the Citation** — reading `123 F.3d 456 (9th Cir. 2019)` piece by piece. Strong snippet candidate.
5. **H2: Procedural History Without the Headache** — how the case got here and why that shapes everything.
6. **H2: Facts vs Allegations** — what the court accepted as established.
7. **H2: Finding the Holding (and Ignoring the Dicta)** — the single most useful skill; give a repeatable test.
8. **H2: Concurrences and Dissents: Why They Exist** — what weight they carry.
9. **H2: Checking Whether It Is Still Good Law** — later history, appeals, reversal; free tools (CourtListener, Google Scholar).
10. **H2: A Reusable Case-Brief Template** — Issue / Rule / Facts / Holding / Reasoning. Highly linkable.
11. **H2: Frequently Asked Questions**
    - Q1: What is the difference between a holding and dicta?
    - Q2: Are unpublished opinions citable?
    - Q3: Where can I read court decisions for free?
12. **H2: Conclusion**

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [What Happens After an Arrest](/articles/what-happens-after-an-arrest/)
- [Child Custody Orders](/articles/child-custody-orders-common-factors/) — reading a custody order

### External Links to Include:
- Cornell LII — Basic Legal Citation
- U.S. Courts — About Federal Courts
- CourtListener / Free Law Project
- Library of Congress — Guide to Law Online

### Notes:
- Most evergreen page on the site — students and self-represented litigants search this year-round.
- The case-brief template is your best natural backlink magnet.

---

## Article 6: At-Will Employment: What It Means and What It Does Not

### Suggested New Title: At-Will Employment: What It Really Means
### Target Word Count: 1,800+
### Target Keyword: what does at-will employment mean
### Secondary: can i be fired for no reason · wrongful termination vs at-will

### Outline:
1. **Introduction** — Hook: "at will" does not mean "for any reason at all," and the gap between those two phrases is where most disputes live.
2. **H2: What At-Will Employment Actually Says** — existing, expand; note Montana as the commonly cited exception without over-claiming.
3. **H2: Reasons That Are Never Lawful** — protected characteristics; federal floor, state and local layers on top.
4. **H2: Retaliation: The Most Common Real-World Claim** — protected activity; why timing matters.
5. **H2: When a Contract or Handbook Changes the Analysis** — written contracts, CBAs, implied promises, offer-letter language.
6. **H2: Public-Policy Limits** — jury duty, voting, refusing illegal acts, filing for workers' compensation.
7. **H2: Final Pay, Notice, and Benefits** — varies by state; COBRA and unemployment as separate systems.
8. **H2: What Documentation Helps if Something Feels Wrong** — a factual, dated record. Deliberately mirrors the injury-evidence article.
9. **H2: Frequently Asked Questions**
   - Q1: Can I be fired for no reason at all?
   - Q2: Do I have to be given notice or severance?
   - Q3: Is being fired unfairly the same as being fired illegally?
   - Q4: How long do I have to file a discrimination charge?
10. **H2: Conclusion**

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [Reasonable Accommodation Requests](/articles/reasonable-accommodation-requests/)
- [Preserving Evidence After an Injury](/articles/preserving-evidence-after-an-injury/) — workplace injuries
- [Choosing Between an LLC and a Corporation](/articles/choosing-llc-or-corporation/) — employer perspective

### External Links to Include:
- Cornell LII — Employment-at-Will Doctrine
- EEOC — Prohibited Employment Policies and Practices
- NLRB — Your Right to Discuss Wages
- DOL — Termination and final pay by state

### Notes:
- Q4 (filing deadlines) is heavily searched. Point at the EEOC's own deadline page rather than stating a number.
- Keep the "unfair ≠ illegal" distinction prominent. It is the honest core of this topic.

---

## Article 7: Security Deposits: Common Tenant and Landlord Rules

### Suggested New Title: Security Deposit Rules Every Renter Should Know
### Target Word Count: 1,800+
### Target Keyword: when do i get my security deposit back
### Secondary: what can a landlord deduct from a security deposit · normal wear and tear examples

### Outline:
1. **Introduction** — Hook: the deposit dispute is usually decided at move-in, not move-out.
2. **H2: Why Your State's Rules Decide Almost Everything** — caps, interest, holding requirements, deadlines.
3. **H2: The Move-In Inspection That Protects You** — checklist, dated photos, written acknowledgement.
4. **H2: Normal Wear and Tear vs Damage** — concrete both-column examples. Highest snippet potential on the page.
5. **H2: Deductions That Are Commonly Allowed** — unpaid rent, damage beyond wear, contractual cleaning, itemisation requirements.
6. **H2: Move-Out: The Sequence That Avoids Disputes** — notice, inspection request, cleaning, keys, forwarding address, proof of the date possession ended.
7. **H2: If the Deposit Is Not Returned** — written demand, itemised statement, small claims as a general concept, state penalty provisions existing (without stating amounts).
8. **H2: Frequently Asked Questions**
   - Q1: How long does a landlord have to return a deposit?
   - Q2: Can a landlord charge for carpet cleaning?
   - Q3: Can a landlord keep the deposit for unpaid rent?
   - Q4: What if I never got a move-in checklist?
9. **H2: Conclusion**

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [Disputing Errors on a Credit Report](/articles/disputing-credit-report-errors/) — unpaid rent reported to collections
- [How to Read a Court Decision](/articles/how-to-read-a-court-decision/) — small-claims judgments

### External Links to Include:
- HUD — Tenant Rights · USA.gov — Tenant Rights
- Consumer Financial Protection Bureau — renting resources
- Your state attorney general's landlord-tenant guide (as an example)

### Notes:
- Strongest candidate on the site for a wear-and-tear comparison table.
- Never state a specific return deadline. Say the deadline is set by state law and link readers to their state's page.

---

## Article 8: Reasonable Accommodation Requests

### Suggested New Title: How to Request a Reasonable Accommodation
### Target Word Count: 1,800+
### Target Keyword: how to ask for a reasonable accommodation at work
### Secondary: what is the interactive process · does an accommodation request have to be in writing

### Outline:
1. **Introduction** — Hook: you do not need legal words or a form — you need a clear connection between a limitation and a change you are asking for.
2. **H2: Which Law Applies to Your Situation** — employment vs housing vs education vs public services; different rules, different agencies.
3. **H2: You Do Not Need Magic Words** — a request can be plain and verbal; why writing it down still helps.
4. **H2: How to Put a Request in Writing** — a factual outline: limitation, requested change, why it helps. **Describe the structure; do not supply a fill-in template that reads as advice.**
5. **H2: The Interactive Process, Step by Step** — a dialogue, not a single decision; alternatives; trial periods.
6. **H2: When Medical Information May Be Requested** — what is generally relevant vs unrelated history; confidentiality expectations.
7. **H2: When a Request Can Be Limited or Denied** — undue hardship, essential functions, direct threat — as concepts, not as verdicts.
8. **H2: Keeping Records and Escalating** — dates, copies, follow-up emails; internal HR routes; agency complaints exist with deadlines.
9. **H2: Frequently Asked Questions**
   - Q1: Does my employer have to give me the exact accommodation I asked for?
   - Q2: Do I have to disclose my diagnosis?
   - Q3: Can I be fired for asking?
   - Q4: How long should an employer take to respond?
10. **H2: Conclusion**

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [At-Will Employment](/articles/at-will-employment-meaning-and-limits/)
- [USCIS Notices](/articles/uscis-notices-types-and-response-basics/) — accommodations at appointments
- [Preserving Evidence After an Injury](/articles/preserving-evidence-after-an-injury/) — documentation discipline

### External Links to Include:
- EEOC — Reasonable Accommodation guidance
- Job Accommodation Network (JAN) — askjan.org
- ADA.gov — Title I employment
- HUD — Reasonable Accommodations in housing

### Notes:
- JAN is the single most useful external resource for this topic — link it prominently.
- Keep "an accommodation request is not a complaint" explicit; it reduces reader fear and is accurate.

---

## Article 9: Child Custody Orders: Factors Courts Commonly Consider

### Suggested New Title: Child Custody: What Courts Actually Consider
### Target Word Count: 1,800+
### Target Keyword: what do judges look at in child custody cases
### Secondary: legal custody vs physical custody · how to prepare for a custody hearing

### Outline:
1. **Introduction** — Hook: "best interests of the child" is the standard everywhere and defined differently in every state.
2. **H2: Legal Custody vs Physical Custody** — decision-making vs living arrangements; joint vs sole across both. Clean snippet target.
3. **H2: What the Best-Interest Standard Usually Includes** — existing, expand into a factor list.
4. **H2: Parenting History and Day-to-Day Caregiving** — existing; the point is the child's routine, not scorekeeping.
5. **H2: Safety Concerns and How Courts Handle Them** — existing; add supervised arrangements and emergency procedures existing by state.
6. **H2: Stability, Schools, and Practical Schedules** — distance, work patterns, exchanges, holidays.
7. **H2: Co-Parenting Communication as a Factor** — willingness to support the other relationship; why hostile messages surface in court.
8. **H2: When a Child's Preference Matters** — varies by age and state; never the sole factor.
9. **H2: Preparing for a Hearing: Records That Help** — calendars, school and medical records, neutral witnesses.
10. **H2: Modifying an Existing Order** — that modification exists and generally requires changed circumstances.
11. **H2: Frequently Asked Questions**
    - Q1: Does the mother automatically get custody?
    - Q2: At what age can a child choose?
    - Q3: Can a custody order be changed later?
    - Q4: What is a parenting plan?
12. **H2: Conclusion**

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [How to Read a Court Decision](/articles/how-to-read-a-court-decision/) — reading your order
- [Security Deposits](/articles/security-deposits-common-rules/) — housing stability after separation

### External Links to Include:
- Child Welfare Information Gateway — Determining the Best Interests of the Child
- USA.gov — Find a Lawyer and Affordable Legal Aid
- Your state's judicial branch self-help centre / parenting-plan forms

### Notes:
- Q1 ("does the mother automatically get custody") is high-volume and answered wrongly all over the internet. Answering it accurately and plainly is a real opportunity.
- Emotionally charged topic. Keep the tone calm and factual; never predict outcomes.

---

## Article 10: Disputing Errors on a Credit Report

### Suggested New Title: How to Dispute a Credit Report Error (Steps)
### Target Word Count: 1,800+
### Target Keyword: how to dispute an error on my credit report
### Secondary: how long does a credit dispute take · what to do if a dispute is rejected

### Outline:
1. **Introduction** — Hook: a dispute succeeds or fails on whether you can show a fact is wrong, not on whether the entry feels unfair.
2. **H2: Getting All Three Reports** — annualcreditreport.com; why the three bureaus differ; what to check line by line.
3. **H2: Error vs Disagreement** — the distinction that decides the outcome. Wrong balance vs "I think it's unfair."
4. **H2: Common Error Types** — accounts that aren't yours, wrong status, duplicate debts, outdated items, mixed files, identity-theft entries.
5. **H2: Building the Evidence Pack** — statements, payoff letters, correspondence; keep it focused.
6. **H2: Filing With the Credit Bureau** — online vs mail; what a dispute must contain; keeping proof of what you sent.
7. **H2: Filing With the Furnisher Too** — why disputing with both routes matters.
8. **H2: What Happens During the Investigation** — reinvestigation, results notice, updated report, statement of dispute.
9. **H2: If the Dispute Is Rejected** — escalation routes: CFPB complaint, state attorney general, adding a statement, consulting a consumer attorney.
10. **H2: Medical Debt and Collections** — separate rules, frequently reported in error. Ties to your injury content.
11. **H2: Protecting Your Information Afterwards** — freezes, fraud alerts, monitoring.
12. **H2: Frequently Asked Questions**
    - Q1: How long does a credit bureau have to investigate?
    - Q2: Does disputing hurt my credit score?
    - Q3: Can I remove accurate negative information?
    - Q4: What if the same error comes back?
13. **H2: Conclusion**

### Internal Links to Include:
- [Legal Basics hub](/categories/legal-basics/)
- [Preserving Evidence After an Injury](/articles/preserving-evidence-after-an-injury/) — medical bills and collections
- [Security Deposits](/articles/security-deposits-common-rules/) — rent reported to collections
- [Choosing Between an LLC and a Corporation](/articles/choosing-llc-or-corporation/) — business vs personal credit

### External Links to Include:
- CFPB — Dispute an error on your credit report
- FTC — Disputing Errors on Credit Reports
- AnnualCreditReport.com (official source)
- FTC — IdentityTheft.gov

### Notes:
- The CFPB and FTC pages are the two most authoritative citations available for this topic — use both.
- Q3 must be answered honestly: accurate negative information generally cannot be removed on demand. Saying otherwise is what credit-repair scam sites do, and AdSense reviewers notice.

---

## PRIORITY ORDER FOR REWRITING

| Order | Article | Why |
|---|---|---|
| 1 | Preserving Evidence After an Injury | Flagship niche, shortest page, highest ad value |
| 2 | What Happens After an Arrest | Already strongest — expanding is the cheapest win |
| 3 | Disputing Credit Report Errors | Strong search demand, excellent citations available |
| 4 | Security Deposits | High volume, snippet-friendly, easy to deepen |
| 5 | At-Will Employment | High volume, clear FAQ opportunities |
| 6 | How to Read a Court Decision | Most evergreen, best backlink potential |
| 7 | Child Custody Orders | High volume, a widely misanswered FAQ |
| 8 | Reasonable Accommodation Requests | Solid niche, JAN citation strength |
| 9 | USCIS Notices | Valuable but highest accuracy risk |
| 10 | LLC vs Corporation | Furthest from the personal-injury focus |

## AFTER EACH REWRITE

1. Set `updated_date` in front-matter (ISO format, not in the future).
2. Keep `meta_description` ≤155 characters — the build enforces it.
3. Keep `excerpt` ≤160 characters.
4. Add `seo_title` if the H1 title plus ` | Lawscope` would exceed 60 characters — the build **fails** otherwise.
5. Add the internal links listed in the outline.
6. Run `npm run check` before pushing.
