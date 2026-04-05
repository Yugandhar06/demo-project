const { addAuditLog } = require("../../lib/audit");
const { requireAuth } = require("../../lib/auth");
const { createId } = require("../../lib/crypto");
const { parseBody, sendJson } = require("../../lib/http");
const { readStore, updateStore } = require("../../lib/store");
const { validateRecordPayload } = require("../../lib/validation");
const { getActiveRecords } = require("../../lib/analytics");

module.exports = async function handler(req, res) {
  if (req.method === "GET") {
    const auth = await requireAuth(req, res, ["admin", "analyst", "viewer"]);
    if (!auth) {
      return;
    }

    const store = await readStore();
    const type = String(req.query.type || "").trim();
    const category = String(req.query.category || "").toLowerCase().trim();
    const startDate = String(req.query.startDate || "").trim();
    const endDate = String(req.query.endDate || "").trim();

    let records = getActiveRecords(store);

    if (type) {
      records = records.filter((record) => record.type === type);
    }

    if (category) {
      records = records.filter((record) =>
        record.category.toLowerCase().includes(category)
      );
    }

    if (startDate) {
      records = records.filter((record) => record.recordDate >= startDate);
    }

    if (endDate) {
      records = records.filter((record) => record.recordDate <= endDate);
    }

    records.sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate));

    return sendJson(res, 200, {
      success: true,
      data: { records },
    });
  }

  if (req.method === "POST") {
    const auth = await requireAuth(req, res, ["admin"]);
    if (!auth) {
      return;
    }

    const body = await parseBody(req);
    const payload = {
      amount: Number(body.amount),
      type: body.type,
      category: String(body.category || "").trim(),
      recordDate: body.recordDate,
      notes: String(body.notes || "").trim(),
    };
    const errors = validateRecordPayload(payload);

    if (errors.length) {
      return sendJson(res, 400, {
        success: false,
        message: "Invalid record payload.",
        errors,
      });
    }

    const timestamp = new Date().toISOString();
    const record = {
      id: createId("rec"),
      ...payload,
      createdBy: auth.user.id,
      updatedBy: auth.user.id,
      createdAt: timestamp,
      updatedAt: timestamp,
      deletedAt: null,
    };

    await updateStore((store) => {
      store.records.push(record);
      addAuditLog(store, {
        userId: auth.user.id,
        action: "CREATE",
        entityType: "record",
        entityId: record.id,
        details: `Created ${record.type} record for ${record.category}.`,
      });
      return store;
    });

    return sendJson(res, 201, {
      success: true,
      message: "Record created successfully.",
      data: { record },
    });
  }

  return sendJson(res, 405, { success: false, message: "Method not allowed." });
};
