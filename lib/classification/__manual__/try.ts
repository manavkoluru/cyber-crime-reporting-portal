/**
 * Manual CLI driver for the classification module — run it WITHOUT the chat.
 *
 *   npm run classify:try -- "Rs 8400 debited from ICICI via GPay after I scanned a refund QR"
 *   npm run classify:try -- "a bank caller made me share an OTP and 25000 vanished"
 *   npm run classify:try -- "someone is harassing me on WhatsApp"           # -> FALLBACK
 *   npm run classify:try -- "paid for a phone online, never got it"  --known '{"amount_stolen":"12000"}'
 *   npm run classify:try -- "<original text> ... it was a UPI transfer"  --candidates UPI_FRAUD,CARD_FRAUD
 *
 * Flags:
 *   --known '<json>'         loose bag of already-known details (chat + image/PDF extraction)
 *   --candidates A,B         simulate the follow-up turn after NEEDS_CLARIFICATION
 *
 * Needs OPENAI_API_KEY — the npm script loads it from .env.local via --env-file.
 */

import OpenAI from 'openai'
import { runClassifier } from '../classifier'
import { legalKBIsStub } from '../legalKB'
import { FINANCE_FRAUD_SUBCATEGORIES } from '../types'
import type { FinanceFraudSubCategory } from '../types'
import type { LooseDetails } from '../mapDetails'

function parseArgs(argv: string[]) {
  const positional: string[] = []
  let known: LooseDetails | undefined
  let candidates: FinanceFraudSubCategory[] | undefined

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--known') {
      const raw = argv[++i]
      try {
        known = JSON.parse(raw) as LooseDetails
      } catch {
        console.error(`--known must be valid JSON. Got: ${raw}`)
        process.exit(1)
      }
    } else if (a === '--candidates') {
      candidates = (argv[++i] || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s): s is FinanceFraudSubCategory =>
          (FINANCE_FRAUD_SUBCATEGORIES as string[]).includes(s)
        )
    } else {
      positional.push(a)
    }
  }
  return { text: positional.join(' ').trim(), known, candidates }
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return ''
  const chunks: Buffer[] = []
  for await (const c of process.stdin) chunks.push(c as Buffer)
  return Buffer.concat(chunks).toString('utf8').trim()
}

function hr(label = '') {
  console.log('\n' + '─'.repeat(72) + (label ? ` ${label}` : ''))
}

async function main() {
  const { text: argText, known, candidates } = parseArgs(process.argv.slice(2))
  const text = argText || (await readStdin())

  if (!text) {
    console.error(
      'Provide a scenario, e.g.:\n  npm run classify:try -- "Rs 8400 debited from ICICI via GPay"'
    )
    process.exit(1)
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error(
      'OPENAI_API_KEY is not set. The npm script loads it from .env.local — check that file has a valid key.'
    )
    process.exit(1)
  }

  const openai = new OpenAI({ apiKey })

  hr('INPUT')
  console.log('text:       ', JSON.stringify(text))
  if (known) console.log('knownDetails:', known)
  if (candidates) console.log('priorCandidates:', candidates)

  const result = await runClassifier(openai, {
    text,
    knownDetails: known,
    priorCandidates: candidates,
  })

  hr('RESULT')
  console.log('status:        ', result.status)
  console.log('confidence:    ', result.confidence)
  console.log('time_critical: ', result.time_critical)

  if (result.status === 'NEEDS_CLARIFICATION') {
    console.log('candidates:    ', result.candidateSubCategories)
    console.log('question:      ', result.clarifyingQuestion)
    console.log(
      '\n→ re-run with:  --candidates ' +
        (result.candidateSubCategories || []).join(',') +
        '   and append the user\'s answer to the text'
    )
    return
  }

  if (result.status === 'FALLBACK') {
    console.log('fallback:      ', result.fallbackCategory)
    hr('EXPLANATION')
    console.log(result.explanation)
    return
  }

  // CLASSIFIED
  console.log('topLevel:      ', result.topLevelCategory)
  console.log('subCategory:   ', result.subCategory)
  if (result.subCategory && legalKBIsStub(result.subCategory)) {
    console.log(
      '\n⚠  legalKB is still STUB for this sub-category — the explanation names the\n' +
        '   sections generically and legalReferences carry placeholder paraphrases.'
    )
  }

  hr('EXPLANATION (user-facing)')
  console.log(result.explanation)

  hr('LEGAL REFERENCES')
  for (const r of result.legalReferences) {
    console.log(`  • ${r.instrument}, ${r.section}`)
    console.log(`    ${r.paraphrase}`)
    console.log(`    ${r.sourceUrl}`)
  }

  if (result.mappedFields) {
    const m = result.mappedFields
    hr('MAPPED FIELDS (from knownDetails)')
    console.log('known:')
    for (const [k, v] of Object.entries(m.known)) console.log(`  ✓ ${k} = ${JSON.stringify(v)}`)
    console.log('missingMandatory (still to collect):')
    for (const f of m.missingMandatory) console.log(`  - ${f.key}  (${f.label})`)
    console.log('filledOptional (never re-ask):')
    for (const f of m.filledOptional) console.log(`  ✓ ${f.key}`)
    console.log('unmapped (kept for the record):')
    for (const [k, v] of Object.entries(m.unmapped)) console.log(`  ? ${k} = ${JSON.stringify(v)}`)
  } else {
    hr('MAPPED FIELDS')
    console.log('(no --known passed; mapDetailsToChecklist not run)')
  }

  hr('FIELD FILE (checklist definition handed to the filing module)')
  console.log(JSON.stringify(result.fieldFile, null, 2))
}

main().catch((err) => {
  console.error('\n[try.ts] failed:', err)
  process.exit(1)
})
