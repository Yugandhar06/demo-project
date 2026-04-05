const { addAuditLog } = require("../../lib/audit");
const { requireAuth } = require("../../lib/auth");
const { createId, createPasswordHash } = require("../../lib/crypto");
const { parseBody, sendJson } = require("../../lib/http");
const { readStore, sanitizeUser, updateStore } = require("../../lib/store");
const { validateUserPayload } = require("../../lib/validation");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const auth = await requireAuth(req, res, ["admin"]);
    if (!auth) {
      return;
    }

    const store = await readStore();
    return sendJson(res, 200, {
      success: true,
      data: { users: store.users.map(sanitizeUser) },
    });
  }

  if (req.method === "POST") {
    const auth = await requireAuth(req, res, ["admin"]);
    if (!auth) {
      return;
    }

    const body = await parseBody(req);
    const payload = {
      name: String(body.name || "").trim(),
      email: String(body.email || "").toLowerCase().trim(),
      password: String(body.password || ""),
      role: String(body.role || "").trim(),
      status: body.status === "inactive" ? "inactive" : "active",
    };
    const errors = validateUserPayload(payload);

    if (errors.length) {
      return sendJson(res, 400, {
        success: false,
        message: "Invalid user payload.",
        errors,
      });
    }

    const store = await readStore();
    const existingUser = store.users.find((entry) => entry.email === payload.email);
    if (existingUser) {
      return sendJson(res, 409, {
        success: false,
        message: "Email already exists.",
        errors: ["Duplicate email"],
      });
    }

    const timestamp = new Date().toISOString();
    const user = {
      id: createId("usr"),
      name: payload.name,
      email: payload.email,
      passwordHash: createPasswordHash(payload.password),
      role: payload.role,
      status: payload.status,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await updateStore((currentStore) => {
      currentStore.users.push(user);
      addAuditLog(currentStore, {
        userId: auth.user.id,
        action: "CREATE",
        entityType: "user",
        entityId: user.id,
        details: `Created user ${user.email} with role ${user.role}.`,
      });
      return currentStore;
    });

    return sendJson(res, 201, {
      success: true,
      message: "User created successfully.",
      data: { user: sanitizeUser(user) },
    });
  }

  return sendJson(res, 405, { success: false, message: "Method not allowed." });
};
