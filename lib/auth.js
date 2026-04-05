const { clearCookie, parseCookies, sendJson, setCookie } = require("./http");
const { readStore, sanitizeUser } = require("./store");
const crypto = require("node:crypto");

const SESSION_COOKIE = "financepro_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;
const SECRET = process.env.SESSION_SECRET || "financepro-demo-secret-key-change-in-prod";

function signPayload(payload) {
  const data = JSON.stringify(payload);
  const encoded = Buffer.from(data).toString("base64url");
  const sig = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
  return `${encoded}.${sig}`;
}

function verifyToken(token) {
  try {
    const [encoded, sig] = token.split(".");
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac("sha256", SECRET).update(encoded).digest("base64url");
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return JSON.parse(Buffer.from(encoded, "base64url").toString());
  } catch { return null; }
}

async function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const token = cookies[SESSION_COOKIE];
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  if (payload.expiresAt <= Date.now()) return null;
  const store = await readStore();
  const user = store.users.find((u) => u.id === payload.userId);
  if (!user || user.status !== "active") return null;
  return { user };
}

async function requireAuth(req, res, allowedRoles = []) {
  const authContext = await getSessionFromRequest(req);
  if (!authContext) {
    sendJson(res, 401, { success: false, message: "Authentication required.", errors: ["Please log in to continue."] });
    return null;
  }
  if (allowedRoles.length && !allowedRoles.includes(authContext.user.role)) {
    sendJson(res, 403, { success: false, message: "You do not have permission to perform this action.", errors: ["Forbidden"] });
    return null;
  }
  return authContext;
}

async function createSession(res, userId) {
  const payload = { userId, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 };
  const token = signPayload(payload);
  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS });
}

async function destroySession(req, res) {
  clearCookie(res, SESSION_COOKIE);
}

function exposeUser(user) { return sanitizeUser(user); }

module.exports = { createSession, destroySession, exposeUser, requireAuth };
