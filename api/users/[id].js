const { addAuditLog } = require("../../lib/audit");
const { requireAuth } = require("../../lib/auth");
const { createPasswordHash } = require("../../lib/crypto");
const { parseBody, sendJson } = require("../../lib/http");
const { readStore, sanitizeUser, updateStore } = require("../../lib/store");
const { validateUserPayload } = require("../../lib/validation");

module.exports = async function handler(req, res) {
  const auth = await requireAuth(req, res, ["admin"]);
  if (!auth) {
    return;
  }

  const userId = req.query.id;
  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    return sendJson(res, 404, {
      success: false,
      message: "User not found.",
      errors: ["Missing user"],
    });
  }

  if (req.method === "PATCH") {
    const body = await parseBody(req);
    const payload = {
      name: body.name !== undefined ? String(body.name || "").trim() : user.name,
      email: body.email !== undefined ? String(body.email || "").toLowerCase().trim() : user.email,
      role: body.role !== undefined ? String(body.role || "").trim() : user.role,
    };
    const errors = validateUserPayload(
      {
        ...payload,
        password: body.password !== undefined ? String(body.password || "") : "placeholder123",
      },
      { partial: true }
    );

    if (errors.length) {
      return sendJson(res, 400, {
        success: false,
        message: "Invalid user payload.",
        errors,
      });
    }

    const duplicateUser = store.users.find(
      (entry) => entry.id !== userId && entry.email === payload.email
    );
    if (duplicateUser) {
      return sendJson(res, 409, {
        success: false,
        message: "Email already exists.",
        errors: ["Duplicate email"],
      });
    }

    let updatedUser;
    await updateStore((currentStore) => {
      const target = currentStore.users.find((entry) => entry.id === userId);
      target.name = payload.name;
      target.email = payload.email;
      target.role = payload.role;
      if (body.password) {
        target.passwordHash = createPasswordHash(body.password);
      }
      target.updatedAt = new Date().toISOString();
      updatedUser = target;
      addAuditLog(currentStore, {
        userId: auth.user.id,
        action: "UPDATE",
        entityType: "user",
        entityId: target.id,
        details: `Updated user ${target.email}.`,
      });
      return currentStore;
    });

    return sendJson(res, 200, {
      success: true,
      message: "User updated successfully.",
      data: { user: sanitizeUser(updatedUser) },
    });
  }

  if (req.method === "DELETE") {
    if (auth.user.id === userId) {
      return sendJson(res, 400, {
        success: false,
        message: "You cannot delete your own account.",
        errors: ["Self deletion is blocked"],
      });
    }

    const activeAdmins = store.users.filter(
      (entry) => entry.role === "admin" && entry.status === "active"
    );
    if (user.role === "admin" && activeAdmins.length <= 1) {
      return sendJson(res, 400, {
        success: false,
        message: "You cannot remove the last active admin.",
        errors: ["At least one active admin is required"],
      });
    }

    await updateStore((currentStore) => {
      currentStore.users = currentStore.users.filter((entry) => entry.id !== userId);
      addAuditLog(currentStore, {
        userId: auth.user.id,
        action: "DELETE",
        entityType: "user",
        entityId: userId,
        details: `Deleted user ${user.email}.`,
      });
      return currentStore;
    });

    return sendJson(res, 200, {
      success: true,
      message: "User deleted successfully.",
    });
  }

  return sendJson(res, 405, { success: false, message: "Method not allowed." });
};
