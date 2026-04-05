const { addAuditLog } = require("../../../lib/audit");
const { requireAuth } = require("../../../lib/auth");
const { parseBody, sendJson } = require("../../../lib/http");
const { readStore, sanitizeUser, updateStore } = require("../../../lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "PATCH") {
    return sendJson(res, 405, { success: false, message: "Method not allowed." });
  }

  const auth = await requireAuth(req, res, ["admin"]);
  if (!auth) {
    return;
  }

  const userId = req.query.id;
  const body = await parseBody(req);
  const status = body.status === "inactive" ? "inactive" : "active";
  const store = await readStore();
  const user = store.users.find((entry) => entry.id === userId);

  if (!user) {
    return sendJson(res, 404, {
      success: false,
      message: "User not found.",
      errors: ["Missing user"],
    });
  }

  if (auth.user.id === userId && status === "inactive") {
    return sendJson(res, 400, {
      success: false,
      message: "You cannot deactivate your own account.",
      errors: ["Self deactivation is blocked"],
    });
  }

  const activeAdmins = store.users.filter(
    (entry) => entry.role === "admin" && entry.status === "active"
  );
  if (user.role === "admin" && user.status === "active" && status === "inactive" && activeAdmins.length <= 1) {
    return sendJson(res, 400, {
      success: false,
      message: "You cannot deactivate the last active admin.",
      errors: ["At least one active admin is required"],
    });
  }

  let updatedUser;
  await updateStore((currentStore) => {
    const target = currentStore.users.find((entry) => entry.id === userId);
    target.status = status;
    target.updatedAt = new Date().toISOString();
    updatedUser = target;
    addAuditLog(currentStore, {
      userId: auth.user.id,
      action: "STATUS_CHANGE",
      entityType: "user",
      entityId: target.id,
      details: `Changed ${target.email} status to ${status}.`,
    });
    return currentStore;
  });

  return sendJson(res, 200, {
    success: true,
    message: "User status updated successfully.",
    data: { user: sanitizeUser(updatedUser) },
  });
};
