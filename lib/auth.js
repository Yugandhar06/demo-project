const { clearCookie, parseCookies, sendJson, setCookie } = require("./http");
const { readStore, sanitizeUser, updateStore } = require("./store");
const { createId, createToken } = require("./crypto");

const SESSION_COOKIE = "financepro_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

// Upstash Redis client
async function redisCall(method, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error("Redis env vars not configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN");
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      command: [method, ...args],
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Redis error: ${data.error}`);
  }

  return data.result;
}

async function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const sessionToken = cookies[SESSION_COOKIE];

  if (!sessionToken) {
    return null;
  }

  try {
    // Try to get session from Redis
    const sessionJson = await redisCall("GET", `session:${sessionToken}`);
    
    if (!sessionJson) {
      return null;
    }

    const session = JSON.parse(sessionJson);

    // Check if session is expired
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      await redisCall("DEL", `session:${sessionToken}`);
      return null;
    }

    const store = await readStore();
    const user = store.users.find((entry) => entry.id === session.userId);

    if (!user || user.status !== "active") {
      return null;
    }

    return { session, user };
  } catch (error) {
    console.error("Session retrieval error:", error);
    return null;
  }
}

async function requireAuth(req, res, allowedRoles = []) {
  const authContext = await getSessionFromRequest(req);

  if (!authContext) {
    sendJson(res, 401, {
      success: false,
      message: "Authentication required.",
      errors: ["Please log in to continue."],
    });
    return null;
  }

  if (allowedRoles.length && !allowedRoles.includes(authContext.user.role)) {
    sendJson(res, 403, {
      success: false,
      message: "You do not have permission to perform this action.",
      errors: ["Forbidden"],
    });
    return null;
  }

  return authContext;
}

async function createSession(res, userId) {
  const token = createToken();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();

  const session = {
    id: createId("ses"),
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt,
  };

  try {
    // Store session in Redis with TTL
    await redisCall("SET", `session:${token}`, JSON.stringify(session), "EX", SESSION_TTL_SECONDS);
  } catch (error) {
    console.error("Failed to create session in Redis:", error);
    throw error;
  }

  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS });
}

async function destroySession(req, res) {
  const cookies = parseCookies(req);
  const sessionToken = cookies[SESSION_COOKIE];

  if (sessionToken) {
    try {
      await redisCall("DEL", `session:${sessionToken}`);
    } catch (error) {
      console.error("Failed to destroy session in Redis:", error);
    }
  }

  clearCookie(res, SESSION_COOKIE);
}

function exposeUser(user) {
  return sanitizeUser(user);
}

module.exports = {
  createSession,
  destroySession,
  exposeUser,
  requireAuth,
};
