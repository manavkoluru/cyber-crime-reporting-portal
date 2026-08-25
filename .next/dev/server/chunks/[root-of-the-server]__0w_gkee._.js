module.exports = [
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/action-async-storage.external.js [external] (next/dist/server/app-render/action-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/action-async-storage.external.js", () => require("next/dist/server/app-render/action-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/runtime-reacts.external.js [external] (next/dist/server/runtime-reacts.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/server/runtime-reacts.external.js", () => require("next/dist/server/runtime-reacts.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/node:stream [external] (node:stream, cjs)", ((__turbopack_context__, module, exports) => {

var mod = __turbopack_context__.x("node:stream", () => require("node:stream"));

module.exports = mod;
}),
"[project]/app/api/auth/login/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/store.ts [app-route] (ecmascript)");
;
;
async function POST(req) {
    try {
        const body = await req.json();
        const { username, password } = body;
        if (!username || !password) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Username and password required'
            }, {
                status: 400
            });
        }
        const user = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["findUserByUsername"])(username);
        if (!user || user.password !== password) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Invalid credentials'
            }, {
                status: 401
            });
        }
        // Create session
        const sessionId = (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$store$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["createSession"])(user.id);
        // Set cookie
        const response = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                name: user.name,
                jurisdiction: user.jurisdiction
            }
        });
        response.cookies.set('auth_session', sessionId, {
            httpOnly: true,
            secure: ("TURBOPACK compile-time value", "development") === 'production',
            maxAge: 24 * 60 * 60,
            path: '/'
        });
        return response;
    } catch (error) {
        console.error('[Auth] Login error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Login failed'
        }, {
            status: 500
        });
    }
}
}),
"[project]/lib/store.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

// In-memory store for demo (resets on server restart)
// Production: replace with database
__turbopack_context__.s([
    "addComplaint",
    ()=>addComplaint,
    "createSession",
    ()=>createSession,
    "deleteSession",
    ()=>deleteSession,
    "findUserByUsername",
    ()=>findUserByUsername,
    "getAllComplaints",
    ()=>getAllComplaints,
    "getComplaint",
    ()=>getComplaint,
    "getComplaintsByJurisdiction",
    ()=>getComplaintsByJurisdiction,
    "getComplaintsByPhone",
    ()=>getComplaintsByPhone,
    "getPincodeJurisdiction",
    ()=>getPincodeJurisdiction,
    "getSession",
    ()=>getSession,
    "getStore",
    ()=>getStore,
    "updateComplaint",
    ()=>updateComplaint
]);
// Global store
const store = {
    complaints: new Map(),
    users: new Map(),
    sessions: new Map()
};
// Demo accounts
const demoUsers = [
    {
        id: 'user_complainant_1',
        username: 'victim@example.com',
        password: 'password123',
        role: 'COMPLAINANT',
        phone: '9876543210',
        name: 'Priya Sharma'
    },
    {
        id: 'user_police_1',
        username: 'police@bangalore.gov',
        password: 'police123',
        role: 'POLICE',
        jurisdiction: 'Bangalore East',
        phone: '9876543200',
        name: 'Inspector Rajesh Kumar'
    },
    {
        id: 'user_police_2',
        username: 'police@bangalore_west.gov',
        password: 'police123',
        role: 'POLICE',
        jurisdiction: 'Bangalore West',
        phone: '9876543201',
        name: 'Inspector Anjali Singh'
    },
    {
        id: 'user_admin_bangalore',
        username: 'admin@bangalore.gov',
        password: 'admin123',
        role: 'ADMIN',
        jurisdiction: 'Bangalore',
        phone: '9876543202',
        name: 'Cyber Crime Head - Bangalore'
    },
    {
        id: 'user_admin_karnataka',
        username: 'admin@karnataka.gov',
        password: 'admin123',
        role: 'ADMIN',
        jurisdiction: 'Karnataka',
        phone: '9876543203',
        name: 'State Cyber Admin - Karnataka'
    }
];
// Initialize demo users
demoUsers.forEach((user)=>{
    store.users.set(user.id, user);
});
function getStore() {
    return store;
}
function addComplaint(complaint) {
    store.complaints.set(complaint.id, complaint);
    return complaint;
}
function getComplaint(id) {
    return store.complaints.get(id);
}
function getComplaintsByPhone(phone) {
    return Array.from(store.complaints.values()).filter((c)=>c.complainantPhone === phone);
}
function getComplaintsByJurisdiction(jurisdiction) {
    return Array.from(store.complaints.values()).filter((c)=>c.assignedJurisdiction === jurisdiction || c.assignedJurisdiction.startsWith(jurisdiction));
}
function getAllComplaints() {
    return Array.from(store.complaints.values());
}
function updateComplaint(id, updates) {
    const complaint = store.complaints.get(id);
    if (!complaint) return null;
    Object.assign(complaint, updates);
    return complaint;
}
function createSession(userId) {
    const user = store.users.get(userId);
    if (!user) return '';
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const session = {
        userId,
        username: user.username,
        role: user.role,
        jurisdiction: user.jurisdiction,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
    store.sessions.set(sessionId, session);
    return sessionId;
}
function getSession(sessionId) {
    const session = store.sessions.get(sessionId);
    if (session && session.expiresAt > new Date()) {
        return session;
    }
    store.sessions.delete(sessionId);
    return undefined;
}
function deleteSession(sessionId) {
    store.sessions.delete(sessionId);
}
function findUserByUsername(username) {
    return Array.from(store.users.values()).find((u)=>u.username === username);
}
function getPincodeJurisdiction(pincode) {
    // Hardcoded pincode → jurisdiction mapping for demo
    const map = {
        '560001': 'Bangalore East',
        '560002': 'Bangalore East',
        '560003': 'Bangalore East',
        '560004': 'Bangalore West',
        '560005': 'Bangalore West',
        '560006': 'Bangalore West',
        '560007': 'Bangalore North',
        '560008': 'Bangalore North',
        '560009': 'Bangalore North',
        '560010': 'Bangalore South'
    };
    return map[pincode] || 'Bangalore East' // default fallback
    ;
}
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__0w_gkee._.js.map