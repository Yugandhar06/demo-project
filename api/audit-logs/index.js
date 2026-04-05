const { requireAuth } = require("../../lib/auth");
const { sendJson } = require("../../lib/http");
const { readStore } = require("../../lib/store");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return sendJson(res, 405, { success: false, message: "Method not allowed." });
  }

  const auth = await requireAuth(req, res, ["admin"]);
  if (!auth) {
    return;
  }

  const page = Math.max(Number(req.query.page || 1), 1);
  const pageSize = 10;
  const store = await readStore();
  const enrichedLogs = store.auditLogs.map((log) => {
    const actor = store.users.find((user) => user.id === log.userId);
    return {
      ...log,
      actorEmail: actor ? actor.email : "system",
    };
  });
  const start = (page - 1) * pageSize;
  const paginatedLogs = enrichedLogs.slice(start, start + pageSize);

  return sendJson(res, 200, {
    success: true,
    data: {
      logs: paginatedLogs,
      pagination: {
        page,
        pageSize,
        total: enrichedLogs.length,
        totalPages: Math.max(Math.ceil(enrichedLogs.length / pageSize), 1),
      },
    },
  });
};
