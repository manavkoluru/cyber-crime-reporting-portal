# Rakshak AI — a faster way to report cyber fraud

> A conversational rebuild of India's cyber-fraud reporting journey. Instead of a
> 40-minute government form, a citizen describes what happened in their own words —
> in Hindi, English or a mix — uploads a screenshot, and gets an official complaint
> number in under two minutes, with the case auto-routed to the right cyber-police
> jurisdiction.
>
> **Built with an OpenAI model (GPT‑4o) at the core of the citizen journey, and with
> Codex as the primary way the project was written.**

---

## 1. The problem I picked

**The service:** the National Cyber Crime Reporting Portal (`cybercrime.gov.in`) —
the single official channel for reporting online financial fraud in India, backed by
the 1930 helpline.

**Who faces it:** anyone who has just lost money to a UPI scam, a vishing call, a
card charge or a fake seller. Overwhelmingly ordinary people — often panicked, often
on a phone, often not fluent in legal or banking English.

**Why the current experience is hard — from personal experience and public record:**

| Friction | What it means for a victim mid-panic |
|---|---|
| A long, multi-section form (personal details, incident details, suspect details, evidence) | 30–60 minutes of typing when every minute matters. Many abandon it and just call 1930, which is busy. |
| The form demands structured fields (12-digit UTR, IFSC, exact timestamps, category codes) | The victim has this information — but it's sitting *inside a screenshot they already have*. They're asked to transcribe it by hand. |
| The citizen must self-classify the fraud ("UPI Fraud" vs "Internet Banking Fraud" vs "Vishing") | Most people can't, so cases get mis-filed and mis-routed. |
| No sense of urgency in the UI | The **"golden hour"** — the ~2-hour window when the receiving bank can still freeze the money — is invisible. The form treats a 10-minute-old fraud and a 10-day-old fraud identically. |
| English-first, form-first | Excludes exactly the users who are most targeted. |

**Why financial fraud, and why first:** it is the largest, fastest-growing, and
most time-sensitive slice of cybercrime reporting in India. **64.8% of all
registered cybercrime cases in 2022 had fraud as the motive** ([NCRB *Crime in
India 2022*, via The Print](https://theprint.in/india/24-spike-in-cybercrime-in-india-shows-ncrb-data-fraud-extortion-sexual-exploitation-top-motives/1871498/)); **3.63M financial-fraud
incidents were reported in 2024** (up from 2.44M in 2023), with **₹22,845 crore
lost — roughly 3× the 2023 figure** ([MoS Home Affairs, Lok Sabha, Jul 2025, via
Business Standard](https://www.business-standard.com/india-news/citizens-lost-over-22-845-crore-to-cyber-criminals-in-2024-govt-tells-ls-125072200883_1.html)). And it is the one category where fast reporting
measurably recovers money — **₹7,000+ crore saved across ~23 lakh complaints**
through the 1930 / CFCFRMS pipeline ([PIB / News on AIR](https://www.newsonair.gov.in/over-rs-7000-crore-saved-through-citizen-financial-cyber-fraud-reporting-and-management-system/)). Full rationale and
sources in [TECHNICAL.md §0](TECHNICAL.md).

**The one problem this prototype solves:** *get a correct, routable financial-fraud
complaint filed in the golden hour, from a phone, in plain language, without a form.*

---

## 2. What I built

A complete citizen journey, start to finish:

```
Landing page  →  "Report fraud now"  →  Login (mock OTP or mock account)
      →  Conversational intake (type / speak / upload screenshot or PDF)
      →  AI extracts transaction details, classifies the fraud, flags golden-hour urgency
      →  Asks ONLY for what's still missing, one question at a time
      →  Plain-language summary  →  citizen confirms  →  complaint filed
      →  Cyber Crime Number (CCN) issued  →  Track the case with a live status timeline
```

Everything a reviewer needs to test is the **citizen** side. A police/admin view
exists only to make the "your case was routed somewhere real" claim tangible — it is
not the thing being judged.

### The AI layer — five roles, one OpenAI model

Every turn of the conversation runs through a small orchestrator
([`app/api/chat/route.ts`](app/api/chat/route.ts)). GPT‑4o does the language work;
the routing, the law, and the field rules are deterministic code so behaviour is
predictable and auditable.

| Role | File | What it does |
|---|---|---|
| **Intent Discovery (IDA)** | [`lib/agents/ida.ts`](lib/agents/ida.ts) | Reads the message **and any uploaded image/PDF** with GPT‑4o vision. Extracts UTR/transaction ID, amount, recipient VPA/phone/name, sender bank, payment app, and the incident time. Computes minutes-since-fraud from a timestamp visible in the screenshot. Rejects irrelevant attachments (a selfie, a meme) instead of hallucinating details from them. |
| **Classifier** | [`lib/classification/`](lib/classification/) | Puts the fraud into one of 7 official *Online Financial Fraud* sub-categories (UPI, card, net-banking, vishing, e-wallet, demat, email-takeover), or asks **one** disambiguating question, or falls back cleanly if it isn't financial fraud. The LLM only picks the category — the legal explanation and the required-fields list come from a local, citeable knowledge base ([`legalKB.ts`](lib/classification/legalKB.ts): BNS 2023, IT Act 2000, RBI limited-liability circular, SEBI SCORES, the 1930 process). |
| **Router** | [`lib/agents/router.ts`](lib/agents/router.ts) | Pure function. Decides: keep gathering info / file the complaint / look up a status / hand to fallback — based on which mandatory fields are present and a confidence score. Marks the case `URGENT` when the golden hour is active. |
| **File Complaint** | [`lib/agents/fileComplaint.ts`](lib/agents/fileComplaint.ts) | Never re-asks for a field already extracted. Collects the few genuinely missing pieces (phone, pincode, a "what happened" statement in the user's own words), shows a summary, and files **only on explicit confirmation**. Generates the CCN, maps pincode → police jurisdiction, and runs a triage rule ([`freezeDecision.ts`](lib/freezeDecision.ts)) that decides instant-freeze vs escalate vs manual-review from confidence + amount + golden-hour + time-of-day. |
| **Retrieval** | [`lib/agents/retrieval.ts`](lib/agents/retrieval.ts) | "Check my complaint status" → lists the caller's real filed complaints (keyed to their verified phone) and shows a case detail with a status timeline. Prompt is hard-constrained to never invent a CCN, amount or status. |
| **Fallback** | [`lib/agents/fallback.ts`](lib/agents/fallback.ts) | Handles confusion warmly, offers four clear choices, and — importantly — surfaces mental-health helplines (iCall, Vandrevala) if the user expresses acute distress. |

### Designed for real Indian users on real phones

- **Conversational, not a form.** Type, tap the mic (browser speech, `en-IN`), or
  upload. One question at a time.
- **Hindi / English / Hinglish** accepted throughout — the model is prompted to
  mirror the user's language.
- **Screenshots do the data entry.** The single highest-value interaction: paste a
  GPay/PhonePe/bank screenshot, and the UTR, amount, recipient and timestamp are
  read out of it. The user confirms rather than transcribes.
- **Golden-hour urgency is front and centre** — a fraud under 2 hours old is flagged
  `⚡ GOLDEN HOUR ACTIVE` and the flow is compressed to file as fast as possible.
- **Mobile-first, light DOM.** Next.js App Router, Tailwind, server-rendered pages,
  no heavy client libraries. Works on a slow connection.
- **Empathy by design.** No blame language; distress is met with helpline numbers.

---

## 3. Why this version is better

| Current portal | Rakshak AI |
|---|---|
| 30–60 min form | **< 2 min** conversation |
| Transcribe UTR/amount/time by hand | **Extracted from the screenshot** you already have |
| Citizen must pick the fraud category | **Auto-classified** into the official sub-category, with the applicable law explained in plain words |
| Golden hour invisible | **Detected and surfaced**; case marked urgent; triage decides freeze vs review |
| Manual routing, frequent mis-files | **Pincode → jurisdiction** routing at filing time |
| English-first | **Hindi / English / Hinglish**, voice or text |
| File and hope | **CCN + live status timeline** you can track |

---

## 4. What works today vs. what is mocked

**Fully working, end to end (real behaviour):**

- The whole citizen journey: landing → login → conversational intake → extraction →
  classification → golden-hour flagging → summary → confirm → CCN → track.
- GPT‑4o vision extraction from uploaded images and PDFs.
- Fraud sub-classification + a citeable legal explanation from the local KB.
- Deterministic routing, golden-hour detection, and the freeze/escalate/review
  triage rule.
- Complaint persistence to disk and per-user status lookup keyed to a verified phone.
- A police/admin view of routed complaints, with status updates and case notes.
- Session behaviour typical of a gov portal (idle timeout, logout on refresh/back).

**Deliberately mocked — because production access would be unsafe or unavailable:**

| Mocked | How | Why |
|---|---|---|
| **OTP login** | Any 4–6 digit code is accepted; the demo OTP is shown/logged. [`otp/send`](app/api/auth/otp/send/route.ts), [`otp-verify`](app/api/chat/otp-verify/route.ts) | No SMS gateway; no real phone verification in a hackathon. |
| **Accounts** | Fixed demo users (citizen / police / admin) in an in-memory store. [`lib/store.ts`](lib/store.ts) | No real identity system. |
| **The complaint filing itself** | Writes to a local JSON file; CCN is generated locally (`CCN-YYYY-NNNNNN`). | The real NCRP has no public write API and must never receive test data. |
| **Bank account freeze** | The triage *decides* an action and the timeline shows it as "pending a verified bank instruction". No freeze is actually performed or claimed. | Only banks/I4C can do this. The UI is careful never to state a freeze happened. |
| **Pincode → jurisdiction** | Small hard-coded Bangalore map. | Stand-in for the I4C jurisdiction directory. |
| **All personal data in demos** | Synthetic names, phones, UTRs, VPAs. No real Aadhaar/PAN/OTP/payment data anywhere. | Per the brief. |

Nothing here touches a live government system, scrapes anything, or uses a private
API. This is not an official product and uses no government branding to imply
endorsement.

---

## 5. How it could work safely at scale

- **Extraction & classification as a service.** The IDA + classifier + KB layer is
  the reusable core. It could sit in front of the *existing* NCRP form as an
  assist ("we pre-filled these fields from your screenshot — check them"), lowering
  risk: humans still confirm, the official form still owns submission.
- **Golden-hour path via I4C rails.** Golden-hour cases route to the existing
  Citizen Financial Cyber Fraud Reporting workflow and the bank/PSP nodal system —
  the freeze decision stays with authorised parties; the AI only prioritises and
  packages the case.
- **Legal KB governance.** `legalKB.ts` carries `last_verified` dates and a
  freshness job; entries are paraphrase-plus-citation, never verbatim statute, and
  reviewable by a legal team before publish.
- **Deterministic where it matters.** Routing, field requirements, and triage are
  plain code and unit-tested — the LLM is scoped to language understanding and
  category choice, so failure modes are inspectable.
- **PII discipline.** Minimise extraction to what the complaint needs; encrypt at
  rest; access-controlled DB instead of the demo JSON store; audit every state
  change (the timeline model already does this).

---

## 6. How I built it — Codex + OpenAI

- **OpenAI model in the product:** GPT‑4o powers every agent —
  vision extraction from screenshots/PDFs, fraud sub-classification, and all
  conversational turns ([`lib/agents/*`](lib/agents/), [`lib/classification/classifier.ts`](lib/classification/classifier.ts)),
  via the `openai` SDK with JSON-mode responses.
- **Codex as the build method:** the multi-agent orchestration, the classification
  module (types, KB wiring, field-requirements loader, the deterministic
  `mapDetailsToChecklist` reshuffle), the golden-hour triage logic, the session
  guard, and the citizen-facing pages were built through Codex, iteratively —
  including its offline test suite ([`lib/classification/__manual__/`](lib/classification/__manual__/),
  `npm run classify:test`, 42 assertions, no network).

---

## 7. Run it locally

**Prerequisites:** Node 18+ and an OpenAI API key with GPT‑4o access.

> This repo pins a build of **Next.js with breaking changes** — see
> [`AGENTS.md`](AGENTS.md). Follow the guides under `node_modules/next/dist/docs/`
> before changing framework-level code.

```bash
npm install
echo "OPENAI_API_KEY=sk-...your-key..." > .env.local
npm run dev
# open http://localhost:3000
```

**Try the journey:**

1. Landing page → **Report fraud now**.
2. Log in — mock OTP (any 10-digit number, then any 4–6 digit code) **or** a demo
   account: `victim@example.com` / `Rakshak-Demo-7fK92m`.
3. In the chat, describe a fraud in your own words and **upload a payment
   screenshot** (or a PDF statement). Watch the details get extracted.
4. Answer the one or two follow-up questions, review the summary, confirm.
5. Copy the **CCN**, then go to **Track Complaint** to see the status timeline.
6. Optional — the routing is real: log in as `police@bangalore.gov` /
   `Rakshak-Police-3pR58w` to see the complaint that got routed there.

### Classification module, on its own

```bash
npm run classify:try -- "Rs 8400 debited from ICICI via GPay after I scanned a refund QR"
npm run classify:try -- "a bank caller made me share an OTP and 25000 vanished"   # -> vishing
npm run classify:test                                                             # offline suite, no key
```

Or over HTTP while `next dev` runs (404 in production):

```bash
curl -s localhost:3000/api/dev/classify -H 'content-type: application/json' \
  -d '{"text":"someone charged my credit card twice for a subscription I never took"}' | jq
```

---

## 8. Project map

```
app/
  page.tsx                     Landing page
  report-fraud/                "How it works" + entry to the chat
  login/  booting/             Mock login (OTP + demo accounts)
  chat/                        The conversational citizen journey
  track-complaint/             Citizen status view + timeline
  police/  admin/  dashboard/  Staff views (supporting, not judged)
  awareness/                   Cyber-safety guidance
  api/
    chat/route.ts              Orchestrator: IDA -> classify -> route -> agent
    chat/otp-verify/           In-chat mock OTP -> session
    auth/                      Mock login / logout / me / OTP
    complaints/                Read own history; staff read + update
    dev/classify/              Dev-only classifier probe (404 in prod)
lib/
  agents/                      ida, router, fileComplaint, retrieval, fallback
  classification/              classifier + legal KB + field requirements + tests
  freezeDecision.ts            Triage: instant-freeze / escalate / manual-review
  store.ts                     In-memory + JSON-file demo store, demo users
  complaintRequirements.ts     Per-category evidence checklist
data/                          Runtime-written complaint JSON (git-ignored)
```

---

## 9. Emergency resources referenced in-product

| Resource | Contact |
|---|---|
| National Cyber Crime Helpline | **1930** (24×7, free) |
| National Cyber Crime Reporting Portal | cybercrime.gov.in |
| National Consumer Helpline | **1800-11-4000** |
| iCall (mental health) | **9152987821** |
| Vandrevala Foundation | **1860-2662-345** (24×7) |

---

## Disclaimer

Rakshak AI is a hackathon prototype. It is **not** an official government service and
is **not** affiliated with or endorsed by any government body. Complaint filing,
login, OTPs and account freezes are **simulated**. For a real complaint, use
[cybercrime.gov.in](https://cybercrime.gov.in) or call **1930**.
