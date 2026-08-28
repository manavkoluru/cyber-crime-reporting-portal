# Complaint Classification Module

Classifies a citizen's free-text description of suspected **Online Financial Fraud** into
one of 7 sub-categories, explains the applicable law in plain language (from an approved
KB), and emits the field-requirements file the downstream **filing** module will consume.

**This module does not file the complaint.**

## Files

| File | Role |
|---|---|
| `types.ts` | All shared types + sub-category enum/labels (**snake_case keys**: `upi_fraud`, `card_fraud`, `internet_banking_fraud`, `vishing`, `ewallet_theft`, `demat_fraud`, `email_takeover`) |
| `classifier.ts` | `runClassifier(openai, { text })` — the entry point. LLM decides the category only |
| `legalKB.ts` | Paraphrase + citation KB (BNS 2023, IT Act 2000, RBI liability circular, SEBI SCORES, 1930 portal process). Auto-published; `last_verified` drives freshness checks |
| `explain.ts` | Builds the 2–4 sentence reassuring lead-in + grouped KB lines: **The laws that apply** / **Your protections** (RBI) / **Where and how to report** (SCORES, 1930) |
| `field-requirements.json` | Per-sub-category mandatory/optional fields + evidence notes. **PROPOSED — confirm vs live NCRP form** |
| `fieldRequirements.ts` | Typed loader/accessors for the JSON |
| `mapDetails.ts` | Maps already-known chat/image/PDF details onto the checklist (no LLM) |
| `index.ts` | Public surface |
| `__manual__/` | Standalone test harness — CLI + offline suite + dev API route |

## Usage

```ts
import OpenAI from 'openai'
import { runClassifier } from '@/lib/classification'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const result = await runClassifier(openai, {
  text: 'I scanned a QR to get a refund and ₹8,400 was debited from my ICICI account via GPay',
  // Everything the conversation already surfaced — free-flow chat + image/PDF (IDA)
  // extraction. Loosely keyed; unknown/IDA keys are mapped onto the checklist.
  knownDetails: {
    utr_or_transaction_id: '770941216078',
    amount_stolen: '8400',
    sender_bank: 'ICICI',
    payment_platform: 'GPay',
  },
})

switch (result.status) {
  case 'CLASSIFIED':
    // result.subCategory, result.confidence, result.explanation, result.legalReferences
    // result.fieldFile      -> the checklist definition for the filing module
    // result.mappedFields    -> what we ALREADY know, slotted onto that checklist:
    //   .known             { checklistKey: value } we have
    //   .missingMandatory  mandatory entries still to collect (the ONLY things to ask for)
    //   .filledOptional    optional entries already captured — never re-ask
    //   .unmapped          leftover details with no checklist slot — keep for the record
    break
  case 'NEEDS_CLARIFICATION':
    // ask result.clarifyingQuestion; then call again:
    // runClassifier(openai, { text: originalText + '\n\n' + userAnswer,
    //                         priorCandidates: result.candidateSubCategories })
    break
  case 'FALLBACK':
    // result.fallbackCategory in NOT_FINANCIAL_FRAUD | DATA_BREACH_NO_LOSS |
    //   OTHER_CYBERCRIME | UNCLASSIFIABLE — route elsewhere, don't force a fit
    break
}

// result.time_critical === true  -> money already lost; surface 1930 helpline first
```

## Output per conversation (to return/store)

1. `topLevelCategory` + `subCategory` (or `fallbackCategory`)
2. `confidence` (0..1)
3. `explanation` (paraphrase + citation links) and `legalReferences`

Plus `time_critical` and, when classified, `fieldFile`.

## Field model (matches the live portal)

Per the NCRP financial-fraud intake (see `source` in the JSON), **only the shared
`common.mandatory_fields` are truly mandatory** for any financial-fraud report:

- incident date & time
- a description in the user's own words (≥ 200 characters)
- complainant ID proof (image)
- name of the bank / wallet / merchant involved (`institution_name`)
- 12-digit transaction ID / UTR
- date of the transaction
- fraud amount

**All suspect / fraudster details are optional** (`common.optional_fields`:
`suspect_mobile`, `suspect_email`, `suspect_bank_account`, `suspect_address`,
`suspect_photo`, `suspect_website_or_handle`).

The 7 sub-categories add **no extra mandatory fields** (`mandatory_fields: []` each).
What differs per sub-category:
- `institution_field_hint` — what `institution_name` means here (e.g. for UPI fraud
  it's the debited bank, not the UPI app)
- `optional_fields` — extra details that help for that fraud type
- `evidence_notes` — which evidence is most useful

### Optional fields are captured, never requested

The user is **not** asked to fill in optional fields. They come from free-flow chat and
from the chat's existing image/PDF recognition. `runClassifier(..., { knownDetails })`
runs `mapDetailsToChecklist()` — a deterministic reshuffle (no LLM) — to slot every
detail we already have onto the checklist:

- IDA / extraction keys are aliased to checklist keys (`IDA_KEY_ALIASES` in
  `mapDetails.ts` — extend as the extraction schema grows)
- details with no checklist slot land in `mappedFields.unmapped` (kept, not dropped)
- only `mappedFields.missingMandatory` should ever be actively collected
- if `time_critical`, the 200-char `incident_description` is not treated as blocking —
  the 1930 step comes first, the full narrative can follow

## Testing this module (independent of the chat)

Three entry points, all under `lib/classification/__manual__/`:

### 1. CLI — free-text trials against the real model

```bash
npm run classify:try -- "Rs 8400 debited from ICICI via GPay after I scanned a refund QR"
npm run classify:try -- "a bank caller made me share an OTP and 25000 vanished"      # -> VISHING
npm run classify:try -- "someone is harassing me on WhatsApp"                        # -> FALLBACK
npm run classify:try -- "money was taken, not sure if UPI or my card"               # -> NEEDS_CLARIFICATION
# follow-up turn after a clarify:
npm run classify:try -- "money was taken. it was my debit card" --candidates UPI_FRAUD,CARD_FRAUD
# feed already-known details (chat + image/PDF extraction):
npm run classify:try -- "Rs 8400 via GPay UPI" --known '{"utr_or_transaction_id":"770941216078","sender_bank":"ICICI"}'
```

Prints `status`, sub-category / fallback / clarifying question, `confidence`,
`time_critical`, the user-facing `explanation`, `legalReferences`, the
`mappedFields` breakdown (when `--known` is passed), and the full `fieldFile`.
Needs `OPENAI_API_KEY` — the script loads it from `.env.local` via `--env-file`.

### 2. Offline suite — deterministic parts, no key / no network

```bash
npm run classify:test
```

Node's built-in test runner via `tsx`. Covers `mapDetailsToChecklist`,
`buildExplanation` (grouped output, RBI-only-for-banking, SCORES-for-demat), the
field-requirements loader, the legal-KB wiring (id integrity,
`SUBCATEGORY_LEGAL_MAP` coverage, `kind` derivation), and the classifier's
non-financial **overlap** parsing via a stubbed OpenAI client — area coercion,
dedup + cap at 3, `overlapUrgent` = any urgent overlap OR `time_critical`,
`OVERLAP_LABEL` coverage (51 assertions).
`legalKB.test.ts` asserts the KB is **not** stubbed — it fails loudly on regression.

### 3. Dev-only HTTP route

```bash
# with `next dev` running:
curl -s localhost:3000/api/dev/classify \
  -H 'content-type: application/json' \
  -d '{"text":"...", "knownDetails":{...}, "priorCandidates":["UPI_FRAUD","CARD_FRAUD"]}' | jq
```

`app/api/dev/classify/route.ts` returns the full `ClassificationResult`. Returns
`404` when `NODE_ENV === 'production'`.

## Legal KB — loaded, auto-published

`legalKB.ts` carries the real paraphrase + citation KB. No human-approval gate:
entries publish as-is; `last_verified` (currently `2026-08-28`) drives a freshness
job. `legalKBIsStub()` is now always `false`; keep the guard so callers stay uniform
if an entry is ever removed. `demat_fraud` and `email_takeover` mappings are
"best-informed", flagged in the KB `_meta` for a later cross-check.

## Still open — one sign-off

**Field lists** — re-check `field-requirements.json` directly on the live form
(this pass was based on RBL Bank's portal guide + the cybercrime.gov.in instructions
PDF), then set `verifiedAgainstPortalOn` to that date. `fieldRequirementsUnverified()`
returns `true` until then. A corrected draft with per-category mandatory fields, a
consent checkbox, `complainant_upi_id`, and SEBI SCORES as a demat `additional_channel`
is pending a separate merge pass.
