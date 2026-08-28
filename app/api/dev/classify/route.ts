import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { runClassifier } from '@/lib/classification'
import type { FinanceFraudSubCategory } from '@/lib/classification'
import type { LooseDetails } from '@/lib/classification'

/**
 * DEV-ONLY manual entry point for the classification module — lets you exercise it
 * over HTTP without the chat while `next dev` is running. Returns 404 in production.
 *
 *   curl -s localhost:3000/api/dev/classify \
 *     -H 'content-type: application/json' \
 *     -d '{"text":"Rs 8400 debited from ICICI via GPay after I scanned a refund QR"}' | jq
 *
 * Body: { text: string, knownDetails?: object, priorCandidates?: string[] }
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 })
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'OPENAI_API_KEY is not configured' },
      { status: 503 }
    )
  }

  let body: {
    text?: string
    knownDetails?: LooseDetails
    priorCandidates?: FinanceFraudSubCategory[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body must be valid JSON' }, { status: 400 })
  }

  if (!body.text || typeof body.text !== 'string') {
    return NextResponse.json({ error: '`text` (string) is required' }, { status: 400 })
  }

  const openai = new OpenAI({ apiKey })
  try {
    const result = await runClassifier(openai, {
      text: body.text,
      knownDetails: body.knownDetails,
      priorCandidates: body.priorCandidates,
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[dev/classify] failed:', error)
    return NextResponse.json({ error: 'Classification failed' }, { status: 500 })
  }
}
