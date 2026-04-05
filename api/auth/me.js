const { exposeUser, requireAuth } = require("../../lib/auth");
const { sendJson } = require("../../lib/http");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { success: false, message: "Method not allowed." });
  }

  const auth = await requireAuth(req, res, ["admin", "analyst", "viewer"]);
  if (!auth) {
    return;
  }

  return sendJson(res, 200, {
    success: true,
    data: { user: exposeUser(auth.user) },
  });
};
