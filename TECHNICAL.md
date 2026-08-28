# Rakshak AI — technical build, design decisions, and rationale

A companion to the [README](README.md). This document is written so a reviewer can
judge the **depth** of the build — the agentic system, the orchestration, the legal
knowledge base, the performance choices, and the policy thinking behind each — not
just the surface.

---

## 0. Why financial fraud, and why first

The pilot targets **online financial fraud** specifically — not cyber-harassment,
CSAM, stalking, hacking-with-no-loss, or the rest of the NCRP surface. The reason is
that financial fraud is, by a wide margin, the largest and fastest-growing category
of cybercrime reporting in India, and it is the one category where **minutes decide
whether the money is recoverable** — which is exactly what a faster intake can move.

**It dominates the complaint volume.**

- Per NCRB's *Crime in India 2022*, **64.8% of all registered cybercrime cases
  (42,710 of 65,893) had fraud as the motive** — more than every other motive
  combined (extortion 5.5%, sexual exploitation 5.2%). ([The Print, on NCRB 2022](https://theprint.in/india/24-spike-in-cybercrime-in-india-shows-ncrb-data-fraud-extortion-sexual-exploitation-top-motives/1871498/))
- On the citizen-facing portals (NCRP + the Citizen Financial Cyber Fraud Reporting
  and Management System, CFCFRMS), **3,637,288 financial-fraud incidents were
  reported in 2024**, up from 2,442,978 in 2023 — a ~49% year-on-year rise. ([Business Standard, citing MoS Home Affairs in the Lok Sabha, 22 Jul 2025](https://www.business-standard.com/india-news/citizens-lost-over-22-845-crore-to-cyber-criminals-in-2024-govt-tells-ls-125072200883_1.html); [The Wire](https://m.thewire.in/article/tech/india-lost-rs-11333-crore-to-cyber-fraud-in-2024))

**The money at stake is large and accelerating.**

- Citizens lost **₹22,845.73 crore to cyber fraud in 2024**, versus ₹7,465.18 crore
  in 2023 — roughly a **3× jump in a single year**. ([Business Standard / Lok Sabha reply](https://www.business-standard.com/india-news/citizens-lost-over-22-845-crore-to-cyber-criminals-in-2024-govt-tells-ls-125072200883_1.html))
- Since 2021, **over ₹10,300 crore has been siphoned by cyber criminals**, per I4C.
  ([Deccan Herald, citing I4C](https://www.deccanherald.com/india/over-rs-10300-crore-siphoned-off-by-cyber-criminals-since-2021-i4c-2834356))
- Within financial fraud, losses concentrate in **stock-trading / investment scams
  (~₹4,636 cr across 2,28,094 complaints) and investment scams (~₹3,216 cr)**, with
  "digital arrest" frauds at ~₹1,616 cr — all flavours of *cheating-induced
  transfer*, which is precisely the pattern this intake is built to capture and
  classify. ([Business Standard / Lok Sabha reply](https://www.business-standard.com/india-news/citizens-lost-over-22-845-crore-to-cyber-criminals-in-2024-govt-tells-ls-125072200883_1.html))

**Fast reporting demonstrably recovers money — so a faster front door is leverage.**

- The government has stated that **over ₹7,000 crore has been saved across ~23 lakh
  complaints** through the CFCFRMS / 1930 pipeline — the mechanism that only works
  if the complaint reaches the system quickly. ([News on AIR / PIB](https://www.newsonair.gov.in/over-rs-7000-crore-saved-through-citizen-financial-cyber-fraud-reporting-and-management-system/))
- The I4C Suspect Registry (Sep 2024) flagged 24.67 lakh mule accounts and helped
  stop **₹8,031 crore** in fraudulent transactions — again, downstream of a timely
  report. ([CyberPeace](https://cyberpeace.org/resources/blogs/the-data-behind-indias-digital-fraud-surge))

**Conclusion for the pilot:** financial fraud is the highest-volume, highest-value,
fastest-growing slice of cybercrime reporting, *and* the slice most sensitive to
intake latency (the "golden hour" for a bank freeze). Cutting a 30–60 minute form
down to a < 2 minute conversation has the most measurable impact here. The
architecture is not fraud-only, though — the classifier already has a clean
`FALLBACK` path for non-financial cybercrime (harassment, data breach with no loss,
etc.), so widening scope later is a matter of adding categories and KB entries, not
re-architecting.

> All figures above are from Indian government disclosures (NCRB *Crime in India
> 2022*; Ministry of Home Affairs / I4C replies in Parliament; PIB) as reported by
> the linked outlets. They are cited to make the case for scope; none are used or
> stored in the product.

---

## 0a. Technical design choices — UX and trust

This is a hackathon about **user experience**, and in cyber fraud the experience
*is* trust. The victim has just been deceived, often by something that looked
official. An AI that then says "I've filed your complaint" has to earn belief in a
moment when the user's trust in digital systems is at its lowest. Almost every design
decision below is downstream of that.

### The core tension

An AI assistant is faster and kinder than a 40-field form — but "an AI did it" is
also exactly the sentence a scam victim has learned to distrust. So the build leans
on three things a scammer cannot cheaply fake: **transparency about what the system
does, citations to real government law, and never claiming an action it didn't take.**

### Trust choice 1 — a dedicated "how Rakshak AI works" page, before the chat

- [`app/report-fraud/page.tsx`](app/report-fraud/page.tsx) is a full page the user
  reads *before* entering the chat. It is not marketing — it is a plain-language
  disclosure: how the conversation works, that it reads your screenshots and
  **extracts only the fields the complaint needs — nothing else**, that it will
  **never file a complaint, lock an account, or take any action without your explicit
  confirmation**, that you'll get an official CCN, that you can call 1930 and talk to
  a human at any point, and that login is required *so the complaint can be tracked
  to your account*.
- **Why a whole page:** a tooltip or a footer line is dismissible and unread. Making
  the "what this does with your data and your consent" content a deliberate,
  paced read (a stepper carousel, a "2 minute read" label, a visible "Skip and
  start reporting" escape hatch) signals that the system has nothing to hide. The
  user who reads it enters the chat already knowing the rules.
- **Design principle:** *disclosure is part of the product, not the fine print.*
- [`app/awareness/page.tsx`](app/awareness/page.tsx) complements it — threat
  education, warning signs, and a clear "if you've been scammed" checklist — so the
  portal is useful even to someone who is not currently mid-incident, and so the
  first contact with the brand is *help*, not a form.

### Trust choice 2 — a knowledge base with real citations to Government of India law

- When the complaint is classified, the user is told **what it is being filed as and
  under which Act and section** — e.g. *"I'm recording this as **UPI fraud**, under
  the 'Online Financial Fraud' category. This is typically dealt with under
  [BNS 2023 s.318](link) and [IT Act 2000 s.66D](link)."* Every legal line is a
  human-written paraphrase with an **inline link to the official source**
  ([`legalKB.ts`](lib/classification/legalKB.ts): BNS 2023, IT Act 2000, the RBI
  limited-liability circular, SEBI SCORES, the 1930 / NCRP process).
- **Why this matters for trust, specifically:** it converts a vague "the AI handled
  it" into a verifiable, checkable claim — *this crime maps to this provision of
  Indian law, and here is the government page that says so*. The citizen (or a
  lawyer, or an officer) can click through. It also quietly teaches the user that
  their situation is a recognised crime with a defined legal path — which is
  reassuring in itself.
- **Why paraphrase-with-citation, never a verbatim quote:** quoting a statute you
  might subtly misquote is a trust risk of its own; a paraphrase that links to the
  real text is both safer and more readable. `explain.ts` writes **no legal claims
  of its own** — it only assembles KB lines. See §6.
- **Design principle:** *the system's authority is borrowed from the government's,
  and it shows its working.*

### Trust choice 3 — the system never claims an action only a bank or officer can take

- The freeze/triage layer ([`freezeDecision.ts`](lib/freezeDecision.ts)) *decides
  and records* a recommended action; the filed-complaint timeline then shows the
  bank and recovery steps as explicitly `PENDING`, with the literal line **"This
  portal has not confirmed a freeze."**
- The "what happens next" copy is about **review by cyber police** and **updates on
  your registered number** — outcomes the system can actually stand behind — not
  promised recoveries.
- **Why:** over-claiming is how you lose a user permanently. The moment they
  discover the "frozen" account wasn't frozen, every other thing the system told
  them is suspect. Under-promising here protects the whole relationship.
- **Design principle:** *only assert what you can be held to.*

### Trust choice 4 — the AI is scoped so its mistakes can't be consequential

- The LLM does language understanding and **one categorical choice**. Everything that
  determines an outcome — whether a complaint is filed, which law is cited, which
  fields are required, what the triage recommends, where the case is routed — is
  **deterministic, readable, unit-tested code** (§2.3, §4, §6).
- **Anti-hallucination is treated as a safety control, not polish:**
  - IDA's **attachment-relevance gate** — an unrelated image (selfie, meme, product
    photo) is refused with a fixed honest message; the model is not allowed to
    invent a transaction from it.
  - The Retrieval agent is fed the real complaint list as authoritative data with a
    hard instruction to **never invent a CCN, amount, date or status**.
  - Error paths return **specific, honest messages** ("the secure AI service is not
    configured … no transaction values were extracted") and point to 1930 — the
    system never silently degrades or fabricates on failure.
- **Design principle:** *put the model where a wrong answer is recoverable; put code
  where it isn't.*

### UX choice 5 — consent is a visible, reversible step

- Filing requires an explicit affirmative. The confirm step renders **Yes / No /
  Modify** as real buttons, with intent detection on the typed reply as a fallback.
  "Modify" is a first-class path back into the flow, not an error.
- The narrative — the citizen's "what happened" statement for the official record —
  **must be typed by the user in their own words that turn**; it is never
  auto-filled from an image caption.
- **Design principle:** *the human commits the complaint; the AI only prepares it.*

### UX choice 6 — the interface earns trust by being fast, calm, and legible

- **One question at a time**, in priority order, never a wall of fields. The user
  is told **what has already been captured** (a live ✅ checklist) so the
  conversation visibly converges instead of feeling open-ended.
- **The screenshot does the data entry.** The highest-trust interaction in the
  product: the user pastes the evidence they already have, and the UTR / amount /
  payee / timestamp are read out and shown back for confirmation. They *check*
  rather than *transcribe* — less effort, and they can see the machine got it right.
- **Golden-hour urgency is surfaced, calmly.** A sub-2-hour fraud is flagged
  `⚡ GOLDEN HOUR ACTIVE` and the flow compresses — urgency communicated without
  panic language.
- **Empathy and safety in the copy.** No blame ("it is not your fault"), Hindi /
  English / Hinglish accepted throughout, and acute-distress signals auto-surface
  mental-health helplines (iCall, Vandrevala) — fraud victims are a known
  suicide-risk group.
- **Government-portal visual and session conventions** — the emblem header, the
  bilingual strip, idle-timeout and logout-on-refresh behaviour
  ([`SessionGuard.tsx`](app/components/SessionGuard.tsx)) — so the prototype reads
  as a credible official service, not a chatbot skin.
- **Mobile-first, light DOM** (Server Components, no heavy client libs) so it is
  usable on a cheap phone and a slow connection — the users most targeted by fraud.
- **Design principle:** *a trustworthy system also has to feel effortless; friction
  reads as either incompetence or a trap.*

---

## 1. How the project was built

- **Stack:** Next.js (App Router) + React 18 + TypeScript + Tailwind. Server
  Components for every static page; a single client component for the chat. The
  `openai` SDK (v4) talks to **GPT‑4o** for every model call. No vector DB, no
  LangChain, no state library — the orchestration is ~260 lines of plain code in
  [`app/api/chat/route.ts`](app/api/chat/route.ts).
- **Codex as the build method.** The multi-agent layer, the classification module
  (types, KB, field-requirements loader, the deterministic detail-mapper), the
  golden-hour triage, the session guard, and the citizen-facing pages were built
  iteratively through Codex — including the offline test suite
  ([`lib/classification/__manual__/`](lib/classification/__manual__/), 42 assertions,
  no network, no API key).
- **Deliberate non-choices:**
  - *No RAG / embeddings.* The legal corpus is small, curated, and changes slowly
    (statutes, one RBI circular, one SEBI channel). A hand-authored, tiered
    knowledge base is more accurate, fully auditable, and adds zero latency. A
    similarity search over statute text would be slower *and* less trustworthy.
  - *No agent framework.* "Agents" here are typed functions with a single
    responsibility and an explicit hand-off contract. Predictable, unit-testable,
    debuggable from a stack trace. The LLM is scoped to language + one categorical
    decision; everything that affects an outcome (routing, law, required fields,
    freeze) is deterministic code.
  - *No database in the prototype.* An in-memory store with JSON snapshots to disk
    ([`lib/store.ts`](lib/store.ts)) is enough to demonstrate the journey and keeps
    setup to `npm install` + one env var. The interface (`addComplaint`,
    `getComplaintsByPhone`, `updateComplaint`, `getComplaintsByJurisdiction`) is
    already DB-shaped, so swapping in Postgres is a store-file change, not a
    rewrite.

---

## 2. The agentic system

Six roles. Each turn of the conversation flows through all of them in a fixed order.

### 2.1 Intent Discovery Agent (IDA) — [`lib/agents/ida.ts`](lib/agents/ida.ts)

- **Job:** turn an unstructured message + any attachment into a structured
  `extracted` object and a warm conversational reply, in one GPT‑4o call
  (`json_object` response format, `temperature: 0.2`).
- **Multimodal:** images are sent as high-detail `image_url` parts; PDFs are flagged
  for text extraction. It reads UTR / transaction ID, amount, recipient
  VPA/phone/name, sender bank, payment app, and — critically — **parses a timestamp
  visible in the screenshot and computes `time_since_fraud_minutes` against
  `new Date()`**, which is what drives golden-hour detection.
- **Design decisions & rationale:**
  - *Extraction and conversation in a single call*, not two. Halves latency and
    cost per turn, and the model's reply stays consistent with what it just
    extracted.
  - *Running state is threaded through, and a fresh empty value never clobbers a
    known one.* Each assistant message carries its `extractedState` in metadata;
    the client echoes it back in `history`; the orchestrator merges
    `{...accumulated, ...fresh-non-empty}`. This is why the user is never asked
    twice for the same field across a multi-turn conversation.
  - *Attachment-relevance gate.* Before extracting, IDA classifies whether the file
    is actually fraud evidence. A selfie / meme / product photo sets
    `attachment_relevant: false`, and the router bounces back to IDA with a fixed,
    honest message instead of letting the model hallucinate a transaction out of an
    unrelated image. **Anti-hallucination is a policy requirement, not a nicety** —
    a fabricated UTR in a real complaint is a serious harm.
  - *Indian number formats* (`1,97,000` → `197000`) are sanitised in code after the
    model returns, not left to the prompt.
  - *One clarifying question per turn, no blame language, mirrors Hindi/English/
    Hinglish* — all enforced in the system prompt because the users are panicked
    and often not English-first.

### 2.2 Classifier — [`lib/classification/`](lib/classification/) (see §3)

Puts the fraud into one of 7 official *Online Financial Fraud* sub-categories, or
asks one disambiguating question, or falls back cleanly. **The LLM chooses only the
category.** Legal text and field lists are deterministic.

### 2.3 Router — [`lib/agents/router.ts`](lib/agents/router.ts)

- **Pure function. Zero LLM calls, zero latency.** Given IDA's output it returns one
  of: `IDA` (keep gathering), `FILE_COMPLAINT_AGENT`, `RETRIEVAL_AGENT`,
  `FALLBACK_AGENT`, plus a `priority` of `URGENT` / `NORMAL`.
- **Decision logic, in order:**
  1. No extraction → fallback.
  2. Irrelevant attachment → back to IDA.
  3. `FILE_COMPLAINT` (or `AMBIGUOUS` **with all mandatory fields present**) **and**
     mandatory fields present → file. `URGENT` if golden-hour and not a consumer
     dispute.
  4. Low confidence (`< 0.55`) **and** >1 critical field missing **and** no
     mandatory fields → back to IDA to gather more.
  5. Explicit `FILE_COMPLAINT` / `CHECK_STATUS` / `GENERAL_INFO` intents → their
     agents.
  6. Anything left → fallback (warm conversation).
- **Rationale:**
  - *Routing must be inspectable and free.* Whether a complaint gets filed is a
    consequential decision; it belongs in code you can read and test, not in a
    prompt. It also keeps the fast path fast (see §5).
  - *"Has the mandatory data" can override "the model wasn't sure of the intent."*
    If the screenshot clearly shows a UTR, an amount and a payee, we should proceed
    even if the user's text was ambiguous — the evidence is the signal.
  - *Consumer disputes are never marked golden-hour urgent* — the golden hour is a
    bank-freeze concept specific to unauthorised financial fraud; applying it to an
    e-commerce dispute would be misleading.

### 2.4 File Complaint Agent — [`lib/agents/fileComplaint.ts`](lib/agents/fileComplaint.ts)

- **Job:** collect only the genuinely missing fields, one at a time, in priority
  order (`UTR > amount > destination > location > phone > narrative`), show a
  summary, and **file only on explicit confirmation**.
- **Hard gate before filing (`canFile`)** — all of: transaction ID, amount, a
  destination (VPA *or* recipient phone/name — a number-to-number transfer is valid
  and must not trigger a "give me the VPA" loop), an incident time, the user's
  phone, a location, a **narrative the user typed in their own words this turn**,
  and an authenticated session. Missing any one → no CCN is generated.
- **Design decisions & rationale:**
  - *"Never re-ask for extracted data" is stated as the agent's first rule*, and
    the prompt is fed an explicit ✅/❌ state block. The single biggest complaint
    about the real form is re-entering data it already has.
  - *The "what happened" narrative must be the user's own words, confirmed this
    turn* (`narrative_confirmed`), not something IDA scraped from an image caption.
    The narrative is the citizen's legal statement for the record — it can't be
    auto-filled.
  - *OTP re-ask guard.* If the session is already authenticated and the model tries
    to ask for an OTP anyway, code intercepts and replaces the response. LLM slips
    shouldn't be able to gate a verified user.
  - *Confirm / decline / modify as real buttons*, with intent detection on the
    reply (`yes|file it|proceed` vs `no|cancel` vs `modify|change|wrong`). Filing
    is a commitment; it needs an unambiguous affirmative, and "modify" needs a
    first-class path.
  - *On filing:* generate `CCN-YYYY-NNNNNN`, map pincode → police jurisdiction
    ([`getPincodeJurisdiction`](lib/store.ts)), run the freeze triage (§4), and
    write a **5-step timeline** whose later steps are explicitly `PENDING` and
    labelled *"this portal has not confirmed a freeze."* The UI must never claim an
    action only a bank can take.

### 2.5 Retrieval Agent — [`lib/agents/retrieval.ts`](lib/agents/retrieval.ts)

- **Job:** "check my complaint status" → list the caller's real complaints (keyed to
  their session-verified phone), then show a case detail with its timeline.
- **Rationale:**
  - *The complaint list is injected into the prompt as authoritative data, with a
    hard instruction never to invent a CCN, amount, date or status.* A status tool
    that hallucinates a case is worse than useless.
  - *Sensitive fields are masked* (`XXXXXX1234`) in the formatter, before the model
    sees them.
  - *Selection is by list number (1, 2, 3), never by asking the user to recite a
    CCN* — small UX call that matters on a phone.

### 2.6 Fallback Agent — [`lib/agents/fallback.ts`](lib/agents/fallback.ts)

- **Job:** handle confusion warmly, offer four clear choices (report / check status
  / consumer dispute / call 1930), ask one question.
- **Policy-critical behaviour:** on signals of acute distress ("lost everything",
  "ruined", "want to die"…), it **immediately surfaces mental-health helplines**
  (iCall `9152987821`, Vandrevala `1860-2662-345`). Fraud victims are a known
  suicide-risk group; this is a deliberate safety design, not an afterthought.

---

## 3. The orchestration — [`app/api/chat/route.ts`](app/api/chat/route.ts)

Every `POST /api/chat` runs:

```
1. Auth resolve      Two cookies: `session` (OTP login, JSON, carries phone)
                     or `auth_session` (staff user/pass, opaque id in the store).
                     Either ⇒ authenticated. Phone, if present, pre-fills the complaint.
2. File decode       Uploaded image/PDF → base64 + media type (in memory, never to disk).
3. State recovery    Walk `history` backwards, take the most recent `extractedState`.
4. IDA               One GPT‑4o call. Merge fresh non-empty values over accumulated state.
5. Router            Pure function → route + priority.
6. Action agent      FILE_COMPLAINT (also runs the classifier once, caches the
                     sub-category, emits a one-line "filing this as X under BNS/IT
                     Act…" preamble on first classification) | RETRIEVAL | FALLBACK
                     | IDA-reply.
7. Persist           Return the agent message + metadata. Metadata always carries the
                     merged `extractedState`, an extraction checklist for the UI,
                     `goldenHour`, and the chosen `route`.
```

**Design decisions & rationale:**

- **Stateless server, state in the transcript.** The client holds the conversation
  and echoes each turn's metadata back. The server keeps nothing per-session in
  memory. This makes the API trivially horizontally scalable and crash-safe, and it
  means "resume a conversation" is free.
- **Fixed pipeline order, not a planner.** IDA → route → act, every time. A planning
  loop that decides its own steps is unpredictable and slow. A fixed pipeline is
  easy to reason about and each stage is independently testable.
- **The classifier runs only on the file-complaint path, once, and is cached** in
  `extractedState.classification`. Re-classification happens only if the
  sub-category actually changes. Saves a GPT‑4o call on every non-filing turn.
- **The legal preamble is shown once.** Code checks the last few assistant messages
  for the "I'm recording this as **…**" marker so re-classification doesn't repeat
  the explanation.
- **Graceful, honest failure.** A missing/invalid API key returns a specific message
  ("the secure AI service is not configured … no transaction values were
  extracted") and points to 1930. A generic failure does the same. The system never
  silently degrades or invents data on error.
- **`maxDuration = 60`** for the serverless function; a single turn is 1–2 model
  calls, comfortably inside that.

---

## 4. The freeze / triage decision — [`lib/freezeDecision.ts`](lib/freezeDecision.ts)

A pure function, `decideFreezeAction({ confidenceScore, amountInRupees,
isGoldenHour, currentHour, fraudCategory })` → `INSTANT_FREEZE` /
`ESCALATE_TO_POLICE` / `MANUAL_REVIEW`, each with a human-readable reason, an
urgency, and an ETA.

- **The rules encode a policy position, deliberately:**
  - High confidence (≥ 0.8) **+ golden hour + > ₹10,000** → recommend instant
    freeze. This is where the money is still recoverable and the signal is strong.
  - **Night-time (22:00–06:00) + confidence ≥ 0.75 + > ₹5,000** → recommend instant
    freeze even outside the golden hour. Off-hours fraud is where victims are
    slowest to notice and human reviewers are scarcest; the bar is lowered to
    compensate.
  - Medium confidence + golden hour → escalate to the assigned officer to decide.
  - High amount + low confidence → **manual review** (don't freeze on a weak signal
    just because the number is big — that's how legitimate accounts get frozen).
  - Low confidence generally → manual review.
- **Rationale:** a freeze harms the account holder if it's wrong. The decision is
  three-way, not binary, and every branch carries its reason so an officer sees
  *why*. In the prototype this **decides and records** — it never performs a freeze,
  and `checkEscalation()` models the "no one acted in time → escalate to admin"
  safety valve. At scale this is the layer that would call the bank/PSP nodal
  system; the decision authority still sits with authorised parties.

---

## 5. Lightweight and fast — the performance decisions

| Decision | Why it keeps things fast / light |
|---|---|
| **Server Components for every page except chat** | HTML over the wire, near-zero client JS on the landing / awareness / track pages. Works on a slow connection and a cheap phone. |
| **One client bundle, hand-rolled icons** | The chat page defines its own tiny SVG/emoji icon components instead of pulling an icon set into the critical path. `lucide-react` is only used in the footer. |
| **Router is a pure function** | The most frequent branch decision costs 0 ms and 0 tokens. |
| **1–2 GPT‑4o calls per turn, max** | IDA does extraction + reply in one call. Classifier runs only when filing, and is cached. Router/freeze/field-mapping are code. |
| **`max_tokens` capped per agent** (IDA 1000, file-complaint 800, retrieval 700, fallback 500, classifier 400) | Bounds worst-case latency and cost; each agent only needs a short reply. |
| **Low temperatures** (0.1 classifier, 0.2 IDA, 0.3 file-complaint) | Fewer retries, more deterministic behaviour, tighter outputs. |
| **`response_format: json_object`** for IDA and the classifier | No brittle parsing / re-prompting on malformed output. |
| **No embeddings / vector store** | The KB is a typed array; lookups are `O(n)` over ~15 entries. Nothing to index, nothing to warm. |
| **Stateless API** | Scales horizontally with no session affinity; a cold instance serves the first request correctly. |
| **In-memory store + JSON snapshot** | No DB round-trip in the demo; disk write is fire-and-forget after the response is composed. |
| **Recent-history window** (last 6–8 turns to the model, not the whole transcript) | Bounds prompt size as a conversation grows. |

---

## 6. The knowledge base — thinking and structure

**Files:** [`legalKB.ts`](lib/classification/legalKB.ts) (the corpus),
[`explain.ts`](lib/classification/explain.ts) (assembles the user-facing text),
[`field-requirements.json`](lib/classification/field-requirements.json) +
[`fieldRequirements.ts`](lib/classification/fieldRequirements.ts) (what to collect),
[`mapDetails.ts`](lib/classification/mapDetails.ts) (slot what we already know).

### 6.1 Why a hand-authored KB and not RAG

- The corpus is **small and stable**: a handful of BNS 2023 sections, a few IT Act
  2000 sections, the RBI limited-liability circular, the SEBI SCORES channel, and
  the 1930 / NCRP process. It does not need semantic search.
- **Accuracy and accountability matter more than coverage.** Every line the user
  sees is a human-written **paraphrase with an inline link to the official source** —
  *never* a verbatim quote of a statute (quoting law you might get subtly wrong is a
  real risk). A legal reviewer can read the whole KB in ten minutes and sign off.
- **Zero latency, zero index.** It's a typed array compiled into the bundle.

### 6.2 Structure and the decisions behind it

- **`chunk_id` per entry** (`bns_318`, `it_act_66d`, `rbi_zero_liability`,
  `sebi_scores_grievance`, …) — stable ids so mappings and tests reference entries
  by key, not by array position.
- **`tier: 1 | 2 | 3`** — 1 = always surface (core statute / right / process),
  2 = situational, 3 = background. `explain.ts` leads with tier 1 and the compact
  preamble uses **only tier-1 statutes**, preferring breadth (one BNS section + one
  IT Act section) so the citizen sees the two most relevant laws first.
- **`kind`, derived from the source doc** — `statute` (BNS / IT Act),
  `protection` (RBI liability & reversal timelines), `channel` (SEBI SCORES and
  other where-else-to-report), `process` (1930 / portal flow). `explain.ts` groups
  the output under three plain headings:
  - **"The laws that apply"** — statutes
  - **"Your protections"** — RBI (shown **only** for bank-rail fraud, where the
    limited-liability circular actually applies — not for, say, a demat case)
  - **"Where and how to report"** — SCORES for demat, the 1930 process for everyone
- **`applicable_subcategories` on each entry + a `SUBCATEGORY_LEGAL_MAP`** — one
  entry serves many sub-categories; the map is what the tests assert full coverage
  against (every sub-category resolves to ≥ 1 tier-1 statute).
- **`last_verified` (ISO date) on every entry** — drives a freshness job.
  `legalKBIsStub()` exists as a guard so callers stay uniform if an entry is ever
  pulled. `demat_fraud` and `email_takeover` mappings are flagged "best-informed,
  pending cross-check" in the KB `_meta` — **the KB is honest about its own
  confidence.**
- **Tone is fixed in `LEAD_IN`** — a 2–4 sentence, non-judgemental opener per
  sub-category ("Being deceived by a convincing caller is very common, and it is not
  your fault.") before any legal content.

### 6.3 Field requirements — modelling the real form

- **`common.mandatory_fields`** mirrors what the **live NCRP financial-fraud intake
  actually requires** (per the portal's instructions and RBL Bank's portal guide,
  cited in the file): incident date/time, a ≥ 200-char description, complainant ID
  proof, institution name, 12-digit UTR, transaction date, fraud amount. **Every
  suspect/fraudster detail is `optional`** — because the portal treats them as
  optional, and demanding them would block victims who don't have them.
- **The 7 sub-categories add no extra *mandatory* fields** (`mandatory_fields: []`),
  matching the real form. What differs per category is:
  - `institution_field_hint` — what "institution name" *means* here (for UPI fraud
    it's the **debited bank**, not the UPI app — a common filing error)
  - `optional_fields` — the details that genuinely help for that fraud type
  - `evidence_notes` — which evidence is most useful
- **`upi_fraud` is the exception:** it declares its own `mandatory_fields` list,
  because that path is backed by the File Complaint chat agent, which hard-blocks
  filing on exactly that subset and *derives* the rest (transaction date from
  time-since-fraud, description from the narrative). The schema comment documents
  this coupling explicitly.
- **`verifiedAgainstPortalOn: null`** and `fieldRequirementsUnverified()` return
  `true` until someone re-checks against the live form. **The system says out loud
  that this list is proposed, not confirmed.**

### 6.4 `mapDetailsToChecklist` — never make the citizen fill a form

- A **deterministic, no-LLM reshuffle**. It takes the loose bag of details the
  conversation already has (chat text + IDA extraction) and slots each onto the
  confirmed sub-category's checklist, producing:
  - `known` — checklist key → value we already have
  - `missingMandatory` — the **only** things the agent should actively ask for
  - `filledOptional` — optional fields we already captured → **never re-ask**
  - `unmapped` — leftover details with no slot → **kept for the officer/record, not
    discarded**
- **`IDA_KEY_ALIASES`** maps extraction field names → checklist keys, ordered
  most-specific-first (`sender_bank` before the shared `institution_name`), so one
  extracted value lands in exactly one checklist slot.
- **If `time_critical`**, the 200-char `incident_description` is **not** treated as
  blocking — the 1930 step comes first, the full narrative can follow. Policy call:
  when money is actively moving, don't hold the citizen at a character counter.

---

## 7. Data that is mocked, and how it was tested

### 7.1 Mocked — and why each has to be

| Area | Implementation | Why mocked |
|---|---|---|
| **OTP send/verify** | [`auth/otp/send`](app/api/auth/otp/send/route.ts) generates a 4-digit code and returns it in the response for the demo; [`chat/otp-verify`](app/api/chat/otp-verify/route.ts) accepts any 4–6 digits and mints a `session` cookie. | No SMS gateway; a hackathon must not do real phone verification or store real numbers. |
| **Accounts** | Fixed demo users (1 citizen, 2 police, 2 admin) seeded in [`lib/store.ts`](lib/store.ts); plaintext passwords, clearly demo. | No real identity provider; staff roles exist only to make routing visible. |
| **Complaint filing** | Written to `data/complaints.json` (git-ignored) via the in-memory store; `CCN-YYYY-NNNNNN` generated locally. | The real NCRP has no public write API and **must never receive synthetic complaints.** |
| **Account freeze** | [`freezeDecision.ts`](lib/freezeDecision.ts) *decides and records* an action; the timeline marks bank/recovery steps `PENDING` with "this portal has not confirmed a freeze." | Only banks / I4C can freeze an account. The UI is written to never imply otherwise. |
| **Pincode → jurisdiction** | Small hard-coded Bangalore-area map in [`lib/store.ts`](lib/store.ts). | Stand-in for the I4C jurisdiction directory. |
| **All PII in demo content** | Synthetic names, phones, UTRs, VPAs throughout. | No real Aadhaar / PAN / OTP / card / payment data anywhere, per the brief. |
| **Session-security theatre** | [`SessionGuard.tsx`](app/components/SessionGuard.tsx) — idle timeout with countdown, logout on refresh / back-button, custom in-page modals (no native dialogs). | Mimics real gov-portal session behaviour so the prototype *feels* like the thing it's replacing. |

**No live government system is touched. Nothing is scraped. No private or undocumented
API is used. No government branding implies endorsement.**

### 7.2 Tested

- **Offline deterministic suite** — `npm run classify:test`
  ([`lib/classification/__manual__/*.test.ts`](lib/classification/__manual__/), Node's
  built-in runner via `tsx`, **no API key, no network, 42 assertions**):
  - `mapDetails.test.ts` — details map to the right checklist keys; alias precedence;
    `time_critical` relaxes the description requirement; unmapped details are kept.
  - `explain.test.ts` — grouped output structure; **RBI shown only for bank-rail
    fraud**; **SCORES shown for demat**; no verbatim statute text.
  - `legalKB.test.ts` — id integrity, `SUBCATEGORY_LEGAL_MAP` covers all 7,
    `kind` derives correctly, and an assertion that **the KB is not stubbed** (fails
    loudly on regression).
  - `fieldRequirements.test.ts` — loader/accessor correctness; common set intact.
- **Live model trials, on demand** — `npm run classify:try -- "<free text>"`
  exercises the real classifier and prints status, sub-category / clarifying question
  / fallback, confidence, `time_critical`, the user-facing explanation, the legal
  references, and the full field file. Example cases in
  [`lib/classification/README.md`](lib/classification/README.md) cover a clean UPI
  case, a vishing case, a non-financial fallback, and a two-way clarification.
- **Dev-only HTTP probe** — `POST /api/dev/classify`
  ([`app/api/dev/classify/route.ts`](app/api/dev/classify/route.ts)) returns the full
  `ClassificationResult` for ad-hoc testing while `next dev` runs; **returns 404 in
  production.**
- **The chat journey end to end** was exercised manually against the golden-hour flow
  (screenshot < 2h → URGENT → file → CCN → track), the number-to-number transfer case
  (name + phone, no VPA — must not loop), the "modify before filing" path, and the
  irrelevant-attachment rejection.

---

## 8. Where the policy depth actually lives

- **Anti-hallucination as a safety requirement.** Attachment-relevance gate,
  "present complaints exactly, never invent a CCN", "no legal claims of our own —
  every line is a cited KB paraphrase", specific honest error messages. A wrong UTR
  or a phantom case in a real complaint is a real-world harm.
- **The golden hour is modelled, not sloganed.** Computed from a real timestamp,
  gates urgency and the triage bar, and is explicitly *not* applied to consumer
  disputes.
- **Freeze is a three-way, reasoned decision** that errs toward manual review on a
  weak signal, and never claims an action only a bank can take.
- **The KB knows the law it's allowed to state**, cites sources inline, paraphrases
  rather than quotes, tiers by relevance, shows RBI protections only where the
  circular applies, and carries verification dates.
- **The field model matches the real form's actual mandatory/optional split** — and
  says out loud (`verifiedAgainstPortalOn: null`) where it's still unconfirmed.
- **Consent is explicit.** Nothing is filed, and no account action is taken, without
  a clear affirmative from the citizen; "modify" is a first-class path.
- **Vulnerable-user safety.** Mental-health helplines surface automatically on
  distress signals.
- **Honest scaling story.** The design is "assist in front of the real form, humans
  still confirm, authorised parties still act" — not "replace the government
  system."
