const { requireAuth } = require("../../lib/auth");
const { sendJson } = require("../../lib/http");
const { readStore } = require("../../lib/store");
const { getDashboardSummary } = require("../../lib/analytics");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { success: false, message: "Method not allowed." });
  }

  const auth = await requireAuth(req, res, ["admin", "analyst", "viewer"]);
  if (!auth) {
    return;
  }

  const store = await readStore();
  return sendJson(res, 200, {
    success: true,
    data: getDashboardSummary(store),
  });
};
