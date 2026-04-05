const { destroySession, requireAuth } = require("../../lib/auth");
const { sendJson } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return sendJson(res, 405, { success: false, message: "Method not allowed." });
  }

  const auth = await requireAuth(req, res, ["admin", "analyst", "viewer"]);
  if (!auth) {
    return;
  }

  await destroySession(req, res);
  return sendJson(res, 200, {
    success: true,
    message: "Logged out successfully.",
  });
};
