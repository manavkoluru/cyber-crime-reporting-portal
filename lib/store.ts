// Local JSON-backed demo store. Production should use an access-controlled database.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'

export interface ComplaintData {
  id: string
  ccn: string
  complainantPhone: string
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
const complaintsFile = path.join(process.cwd(), 'data', 'complaints.json')

function persistComplaints() {
  mkdirSync(path.dirname(complaintsFile), { recursive: true })
  writeFileSync(complaintsFile, JSON.stringify(Array.from(store.complaints.values()), null, 2), 'utf8')
}

function loadPersistedComplaints() {
  if (!existsSync(complaintsFile)) return
  try {
    const saved = JSON.parse(readFileSync(complaintsFile, 'utf8')) as ComplaintData[]
    saved.forEach((complaint) => {
      complaint.timestamp = new Date(complaint.timestamp)
      complaint.timeline = (complaint.timeline || []).map((event) => ({ ...event, timestamp: new Date(event.timestamp) }))
      store.complaints.set(complaint.id, complaint)
    })
  } catch (error) {
    console.error('[Store] Could not load local complaint history:', error)
  }
}

// Demo accounts
const demoUsers: User[] = [
  {
    id: 'user_complainant_1',
    username: 'victim@example.com',
    password: 'password123',
    role: 'COMPLAINANT',
    phone: '9876543210',
    name: 'Priya Sharma',
  },
  {
    id: 'user_police_1',
    username: 'police@bangalore.gov',
    password: 'Police@123',
    role: 'POLICE',
    jurisdiction: 'Bangalore East',
    phone: '9876543200',
    name: 'Inspector Rajesh Kumar',
  },
  {
    id: 'user_police_2',
    username: 'police_west@bangalore.gov',
    password: 'Police@123',
    role: 'POLICE',
    jurisdiction: 'Bangalore West',
    phone: '9876543201',
    name: 'Inspector Anjali Singh',
  },
  {
    id: 'user_admin_bangalore',
    username: 'admin@bangalore.gov',
    password: 'Admin@2026',
    role: 'ADMIN',
    jurisdiction: 'Bangalore', // city-level
    phone: '9876543202',
    name: 'Cyber Crime Head - Bangalore',
  },
  {
    id: 'user_admin_karnataka',
    username: 'admin@karnataka.gov',
    password: 'Admin@2026',
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
loadPersistedComplaints()

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

// Mobile complaint mapping functions
const mobileComplaintsFile = path.join(process.cwd(), 'data', 'mobile_complaints.json')

function persistMobileComplaints() {
  try {
    const mapping: Record<string, string[]> = {}
    for (const [phone, complaints] of store.complaints.entries()) {
      if (complaints.complainantPhone) {
        if (!mapping[complaints.complainantPhone]) {
          mapping[complaints.complainantPhone] = []
        }
        if (!mapping[complaints.complainantPhone].includes(complaints.id)) {
          mapping[complaints.complainantPhone].push(complaints.id)
        }
      }
    }
    
    mkdirSync(path.dirname(mobileComplaintsFile), { recursive: true })
    writeFileSync(mobileComplaintsFile, JSON.stringify({ mobile_to_complaints: mapping, version: '1.0', lastUpdated: new Date().toISOString() }, null, 2), 'utf8')
  } catch (error) {
    console.error('[Store] Failed to persist mobile complaints mapping:', error)
  }
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
