/**
 * Persistence backend for filed complaints. Two implementations, picked at runtime:
 *
 *   - Local dev  -> a JSON file at ./data/complaints.json (fast, zero setup)
 *   - Vercel / prod -> Upstash Redis (the serverless filesystem is read-only & ephemeral)
 *
 * Selection: if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set, use Redis.
 * Otherwise fall back to the file. Every write persists the FULL list (small dataset,
 * simplicity over cleverness). Reads are served from the in-memory Map in store.ts;
 * this module only handles load-on-boot and write-through.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import type { ComplaintData } from './store'

const REDIS_KEY = 'ccrp:complaints'
const FILE_PATH = path.join(process.cwd(), 'data', 'complaints.json')

const hasRedis = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

// Lazy Redis client so local dev never imports/instantiates it.
let redisClient: import('@upstash/redis').Redis | null = null
async function redis() {
  if (!redisClient) {
    const { Redis } = await import('@upstash/redis')
    redisClient = Redis.fromEnv()
  }
  return redisClient
}

/** Revive Date fields that JSON stringified to strings. */
function reviveDates(list: ComplaintData[]): ComplaintData[] {
  return (list || []).map((c) => ({
    ...c,
    timestamp: new Date(c.timestamp),
    timeline: (c.timeline || []).map((e) => ({ ...e, timestamp: new Date(e.timestamp) })),
    policeNotes: (c.policeNotes || []).map((n) => ({ ...n, timestamp: new Date(n.timestamp) })),
  }))
}

/** Load all persisted complaints on server boot. Never throws. */
export async function loadAllComplaints(): Promise<ComplaintData[]> {
  try {
    if (hasRedis) {
      const raw = await (await redis()).get<ComplaintData[] | string>(REDIS_KEY)
      if (!raw) return []
      const parsed = typeof raw === 'string' ? (JSON.parse(raw) as ComplaintData[]) : raw
      return reviveDates(parsed)
    }
    if (!existsSync(FILE_PATH)) return []
    return reviveDates(JSON.parse(readFileSync(FILE_PATH, 'utf8')) as ComplaintData[])
  } catch (err) {
    console.error('[complaintPersistence] load failed:', err)
    return []
  }
}

/** Persist the full complaint list (write-through on every add/update). Never throws. */
export async function saveAllComplaints(list: ComplaintData[]): Promise<void> {
  try {
    if (hasRedis) {
      await (await redis()).set(REDIS_KEY, JSON.stringify(list))
      return
    }
    mkdirSync(path.dirname(FILE_PATH), { recursive: true })
    writeFileSync(FILE_PATH, JSON.stringify(list, null, 2), 'utf8')
  } catch (err) {
    // On Vercel without Redis this WILL fail (read-only FS). Log once, don't crash.
    console.error('[complaintPersistence] save failed (data will not persist):', err)
  }
}

export const persistenceMode = hasRedis ? 'redis' : 'file'
