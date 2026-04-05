const { clearCookie, parseCookies, sendJson, setCookie } = require("./http");
const { readStore, sanitizeUser, updateStore } = require("./store");
const { createId, createToken } = require("./crypto");

const SESSION_COOKIE = "financepro_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12;

async function getSessionFromRequest(req) {
  const cookies = parseCookies(req);
  const sessionToken = cookies[SESSION_COOKIE];

  if (!sessionToken) {
    return null;
  }

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

  await updateStore((store) => {
    store.sessions = store.sessions.filter(
      (session) => new Date(session.expiresAt).getTime() > Date.now()
    );
    store.sessions.push({
      id: createId("ses"),
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
    });
    return store;
  });

  setCookie(res, SESSION_COOKIE, token, { maxAge: SESSION_TTL_SECONDS });
}

async function destroySession(req, res) {
  const cookies = parseCookies(req);
  const sessionToken = cookies[SESSION_COOKIE];

  if (sessionToken) {
    await updateStore((store) => {
      store.sessions = store.sessions.filter((entry) => entry.token !== sessionToken);
      return store;
    });
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
