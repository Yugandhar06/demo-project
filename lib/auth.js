const { clearCookie, parseCookies, sendJson, setCookie } = require("./http");
const { readStore, sanitizeUser, updateStore } = require("./store");
const { createId, createToken } = require("./crypto");

const SESSION_COOKIE = "financepro_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

// Check if Redis is configured
const hasRedis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN;

// Upstash Redis client (only used if configured)
async function redisCall(method, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

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
    if (hasRedis) {
      // Use Redis for session storage on Vercel
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
    } else {
      // Fallback to JSON store for local development
      const store = await readStore();
      const session = store.sessions.find(
        (entry) =>
          entry.token === sessionToken && new Date(entry.expiresAt).getTime() > Date.now()
      );

      if (!session) {
        return null;
      }

      const user = store.users.find((entry) => entry.id === session.userId);

      if (!user || user.status !== "active") {
        return null;
      }

      return { session, user };
    }
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
    if (hasRedis) {
      // Store session in Redis with TTL on Vercel
      await redisCall("SET", `session:${token}`, JSON.stringify(session), "EX", SESSION_TTL_SECONDS);
    } else {
      // Fallback to JSON store for local development
      await updateStore((store) => {
        store.sessions = store.sessions.filter(
          (session) => new Date(session.expiresAt).getTime() > Date.now()
        );
        store.sessions.push(session);
        return store;
      });
    }
  } catch (error) {
    console.error("Failed to create session:", error);
    throw error;
  }

  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS });
}

async function destroySession(req, res) {
  const cookies = parseCookies(req);
  const sessionToken = cookies[SESSION_COOKIE];

  try {
    if (hasRedis) {
      // Delete from Redis
      if (sessionToken) {
        await redisCall("DEL", `session:${sessionToken}`);
      }
    } else {
      // Fallback to JSON store
      if (sessionToken) {
        await updateStore((store) => {
          store.sessions = store.sessions.filter((entry) => entry.token !== sessionToken);
          return store;
        });
      }
    }
  } catch (error) {
    console.error("Failed to destroy session:", error);
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
