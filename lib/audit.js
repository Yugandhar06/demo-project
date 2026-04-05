const { createId } = require("./crypto");

function addAuditLog(store, { userId, action, entityType, entityId, details }) {
  store.auditLogs.unshift({
    id: createId("log"),
    userId,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  });
}

module.exports = {
  addAuditLog,
};
