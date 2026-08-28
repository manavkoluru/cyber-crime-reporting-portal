// In-memory demo store for complaints/users/sessions. Complaints are persisted via
// lib/complaintPersistence.ts (JSON file locally, Upstash Redis on Vercel/prod).
import { loadAllComplaints, saveAllComplaints } from './complaintPersistence'

export interface ComplaintData {
  id: string
  ccn: string
  complainantPhone: string
  /** The logged-in complainant's user id, when known. Primary key for "my complaints". */
  complainantUserId?: string
  complainantName?: string
  complainantLocation: string // pincode or address
  fraudNarrative: string // what happened
  amount: number
  receiver: string // UPI/account
  utr: string
  paymentPlatform: string
  senderBank?: string // bank from which money was debited
  receiverBank?: string // recipient bank (if known)
  timestamp: Date
  status: 'FILED' | 'REVIEWED' | 'PENDING_CLARIFICATION' | 'UNDER_INVESTIGATION' | 'ACCOUNT_FROZEN' | 'RESOLVED' | 'SENT_FOR_FREEZING'
  confidenceScore: number
  assignedPoliceName?: string
  assignedPoliceId?: string
  assignedJurisdiction: string // e.g., "Bangalore East"
  frozenAccounts: string[] // list of frozen UPIs/accounts
  timeline: TimelineEvent[]
  escalatedToAdmin: boolean
  adminNotes?: string
  policeNotes?: Array<{ timestamp: Date; officer: string; note: string; isPublic: boolean }>
  isGoldenHour?: boolean
  goldenHourAutoFrozen?: boolean
}

export interface TimelineEvent {
  timestamp: Date
  action: string
  actor: string // user ID or "SYSTEM"
  details?: string
  state?: 'COMPLETED' | 'CURRENT' | 'PENDING'
}

export interface User {
  id: string
  username: string
  password: string // plaintext for demo
  role: 'COMPLAINANT' | 'POLICE' | 'ADMIN'
  jurisdiction?: string // for POLICE: "Bangalore East", for ADMIN: state or "NATIONAL"
  phone: string
  name: string
}

export interface SessionData {
  userId: string
  username: string
  role: string
  jurisdiction?: string
  expiresAt: Date
}

// Global store
const store = {
  complaints: new Map<string, ComplaintData>(),
  users: new Map<string, User>(),
  sessions: new Map<string, SessionData>(),
}
/** Write-through: persist the full complaint list. Fire-and-forget. */
function persistComplaints() {
  void saveAllComplaints(Array.from(store.complaints.values()))
}

/**
 * Load persisted complaints into the in-memory Map. Runs once on boot.
 * `storeReady` resolves when done; API routes await it before serving.
 */
let _resolveReady!: () => void
export const storeReady: Promise<void> = new Promise((r) => (_resolveReady = r))

async function loadPersistedComplaints() {
  try {
    const saved = await loadAllComplaints()
    saved.forEach((complaint) => store.complaints.set(complaint.id, complaint))
  } catch (error) {
    console.error('[Store] Could not load complaint history:', error)
  } finally {
    _resolveReady()
  }
}

// Demo accounts
const demoUsers: User[] = [
  {
    id: 'user_complainant_1',
    username: 'victim@example.com',
    password: 'Rakshak-Demo-7fK92m',
    role: 'COMPLAINANT',
    phone: '9876543210',
    name: 'Priya Sharma',
  },
  {
    id: 'user_police_1',
    username: 'police@bangalore.gov',
    password: 'Rakshak-Police-3pR58w',
    role: 'POLICE',
    jurisdiction: 'Bangalore East',
    phone: '9876543200',
    name: 'Inspector Rajesh Kumar',
  },
  {
    id: 'user_police_2',
    username: 'police_west@bangalore.gov',
    password: 'Rakshak-Police-3pR58w',
    role: 'POLICE',
    jurisdiction: 'Bangalore West',
    phone: '9876543201',
    name: 'Inspector Anjali Singh',
  },
  {
    id: 'user_admin_bangalore',
    username: 'admin@bangalore.gov',
    password: 'Rakshak-Admin-9xQ41v',
    role: 'ADMIN',
    jurisdiction: 'Bangalore', // city-level
    phone: '9876543202',
    name: 'Cyber Crime Head - Bangalore',
  },
  {
    id: 'user_admin_karnataka',
    username: 'admin@karnataka.gov',
    password: 'Rakshak-Admin-9xQ41v',
    role: 'ADMIN',
    jurisdiction: 'Karnataka', // state-level
    phone: '9876543203',
    name: 'State Cyber Admin - Karnataka',
  },
]

// Initialize demo users
demoUsers.forEach((user) => {
  store.users.set(user.id, user)
})
void loadPersistedComplaints()

export function getStore() {
  return store
}

export function addComplaint(complaint: ComplaintData) {
  store.complaints.set(complaint.id, complaint)
  persistComplaints()
  persistMobileComplaints()
  return complaint
}

export function getComplaint(id: string): ComplaintData | undefined {
  return store.complaints.get(id)
}

export function getComplaintsByPhone(phone: string): ComplaintData[] {
  return Array.from(store.complaints.values()).filter(
    (c) => c.complainantPhone === phone
  )
}

/**
 * A complainant's own complaints, matched by user id first (reliable) and by any
 * phone in `phones` second (covers OTP login + the phone typed during the chat).
 */
export function getComplaintsForComplainant(
  userId: string | undefined,
  phones: (string | undefined | null)[] = []
): ComplaintData[] {
  const phoneSet = new Set(phones.filter(Boolean) as string[])
  return Array.from(store.complaints.values()).filter(
    (c) =>
      (userId && c.complainantUserId === userId) ||
      phoneSet.has(c.complainantPhone)
  )
}

export function getComplaintsByJurisdiction(jurisdiction: string): ComplaintData[] {
  return Array.from(store.complaints.values()).filter(
    (c) => c.assignedJurisdiction === jurisdiction || c.assignedJurisdiction.startsWith(jurisdiction)
  )
}

export function getAllComplaints(): ComplaintData[] {
  return Array.from(store.complaints.values())
}

export function updateComplaint(id: string, updates: Partial<ComplaintData>) {
  const complaint = store.complaints.get(id)
  if (!complaint) return null
  Object.assign(complaint, updates)
  persistComplaints()
  return complaint
}

export function createSession(userId: string): string {
  const user = store.users.get(userId)
  if (!user) return ''

  const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const session: SessionData = {
    userId,
    username: user.username,
    role: user.role,
    jurisdiction: user.jurisdiction,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  }
  store.sessions.set(sessionId, session)
  return sessionId
}

export function getSession(sessionId: string): SessionData | undefined {
  const session = store.sessions.get(sessionId)
  if (session && session.expiresAt > new Date()) {
    return session
  }
  store.sessions.delete(sessionId)
  return undefined
}

export function deleteSession(sessionId: string) {
  store.sessions.delete(sessionId)
}

export function findUserByUsername(username: string): User | undefined {
  return Array.from(store.users.values()).find((u) => u.username === username)
}

export function getUserById(id: string): User | undefined {
  return store.users.get(id)
}

export function getAssignedOfficer(jurisdiction: string): User | undefined {
  return Array.from(store.users.values()).find((user) => user.role === 'POLICE' && user.jurisdiction === jurisdiction)
}

export function getPincodeJurisdiction(pincode: string): string {
  // Hardcoded pincode → jurisdiction mapping for demo
  const map: Record<string, string> = {
    '560001': 'Bangalore East',
    '560002': 'Bangalore East',
    '560003': 'Bangalore East',
    '560004': 'Bangalore West',
    '560005': 'Bangalore West',
    '560006': 'Bangalore West',
    '560007': 'Bangalore North',
    '560008': 'Bangalore North',
    '560009': 'Bangalore North',
    '560010': 'Bangalore South',
  }
  return map[pincode] || 'Bangalore East' // default fallback
}

// Mobile complaint mapping. The phone->complaint index is derived on the fly from the
// complaints Map, so there is nothing separate to persist. Kept as a no-op so existing
// call sites (addComplaint) don't need touching.
function persistMobileComplaints() {
  /* no-op: index is derived, see getMobileComplaintMapping */
}

function getMobileComplaintMapping(phone: string): string[] {
  return Array.from(store.complaints.values())
    .filter(c => c.complainantPhone === phone)
    .map(c => c.id)
}

// Override addComplaint to also update mobile mapping
const originalAddComplaint = addComplaint
export function addComplaintWithMobileMapping(complaint: ComplaintData) {
  const result = originalAddComplaint(complaint)
  persistMobileComplaints()
  return result
}

export function getMobileComplaints(phone: string): ComplaintData[] {
  const complaintIds = getMobileComplaintMapping(phone)
  return complaintIds.map(id => store.complaints.get(id)!).filter(Boolean)
}
