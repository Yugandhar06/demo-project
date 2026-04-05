const { addAuditLog } = require("../../lib/audit");
const { requireAuth } = require("../../lib/auth");
const { parseBody, sendJson } = require("../../lib/http");
const { readStore, updateStore } = require("../../lib/store");
const { validateRecordPayload } = require("../../lib/validation");

module.exports = async function handler(req, res) {
  const auth = await requireAuth(
    req,
    res,
    req.method === "GET" ? ["admin", "analyst", "viewer"] : ["admin"]
  );
  if (!auth) {
    return;
  }

  const recordId = req.query.id;
  const store = await readStore();
  const record = store.records.find((entry) => entry.id === recordId && !entry.deletedAt);

  if (!record) {
    return sendJson(res, 404, {
      success: false,
      message: "Record not found.",
      errors: ["Missing record"],
    });
  }

  if (req.method === "GET") {
    return sendJson(res, 200, {
      success: true,
      data: { record },
    });
  }

  if (req.method === "PATCH") {
    const body = await parseBody(req);
    const payload = {
      amount: body.amount !== undefined ? Number(body.amount) : record.amount,
      type: body.type !== undefined ? body.type : record.type,
      category: body.category !== undefined ? String(body.category || "").trim() : record.category,
      recordDate: body.recordDate !== undefined ? body.recordDate : record.recordDate,
      notes: body.notes !== undefined ? String(body.notes || "").trim() : record.notes,
    };
    const errors = validateRecordPayload(payload);

    if (errors.length) {
      return sendJson(res, 400, {
        success: false,
        message: "Invalid record payload.",
        errors,
      });
    }

    let updatedRecord;
    await updateStore((currentStore) => {
      const target = currentStore.records.find((entry) => entry.id === recordId);
      Object.assign(target, payload, {
        updatedBy: auth.user.id,
        updatedAt: new Date().toISOString(),
      });
      updatedRecord = target;
      addAuditLog(currentStore, {
        userId: auth.user.id,
        action: "UPDATE",
        entityType: "record",
        entityId: target.id,
        details: `Updated record ${target.id}.`,
      });
      return currentStore;
    });

    return sendJson(res, 200, {
      success: true,
      message: "Record updated successfully.",
      data: { record: updatedRecord },
    });
  }

  if (req.method === "DELETE") {
    await updateStore((currentStore) => {
      const target = currentStore.records.find((entry) => entry.id === recordId);
      target.deletedAt = new Date().toISOString();
      target.updatedBy = auth.user.id;
      target.updatedAt = new Date().toISOString();
      addAuditLog(currentStore, {
        userId: auth.user.id,
        action: "DELETE",
        entityType: "record",
        entityId: target.id,
        details: `Soft deleted record ${target.id}.`,
      });
      return currentStore;
    });

    return sendJson(res, 200, {
      success: true,
      message: "Record deleted successfully.",
    });
  }

  return sendJson(res, 405, { success: false, message: "Method not allowed." });
};
