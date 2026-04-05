const { addAuditLog } = require("../../lib/audit");
const { createSession, exposeUser } = require("../../lib/auth");
const { parseBody, sendJson } = require("../../lib/http");
const { readStore, updateStore } = require("../../lib/store");
const { verifyPassword } = require("../../lib/crypto");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { success: false, message: "Method not allowed." });
  }

  const body = await parseBody(req);
  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");

  if (!email || !password) {
    return sendJson(res, 400, {
      success: false,
      message: "Email and password are required.",
      errors: ["Missing credentials"],
    });
  }

  const store = await readStore();
  const user = store.users.find((entry) => entry.email === email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return sendJson(res, 401, {
      success: false,
      message: "Invalid email or password.",
      errors: ["Invalid credentials"],
    });
  }

  if (user.status !== "active") {
    return sendJson(res, 403, {
      success: false,
      message: "This account is inactive.",
      errors: ["Inactive account"],
    });
  }

  await createSession(res, user.id);

  await updateStore((currentStore) => {
    addAuditLog(currentStore, {
      userId: user.id,
      action: "LOGIN",
      entityType: "session",
      entityId: user.id,
      details: `${user.email} logged in.`,
    });
    return currentStore;
  });

  return sendJson(res, 200, {
    success: true,
    message: "Login successful.",
    data: { user: exposeUser(user) },
  });
};
