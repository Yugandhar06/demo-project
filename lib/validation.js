function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateUserPayload(payload, { partial = false } = {}) {
  const errors = [];
  const allowedRoles = ["admin", "analyst", "viewer"];

  if (!partial || payload.name !== undefined) {
    if (!payload.name || payload.name.trim().length < 2) {
      errors.push("Name must be at least 2 characters long.");
    }
  }

  if (!partial || payload.email !== undefined) {
    if (!isValidEmail(payload.email || "")) {
      errors.push("A valid email address is required.");
    }
  }

  if (!partial || payload.role !== undefined) {
    if (!allowedRoles.includes(payload.role)) {
      errors.push("Role must be admin, analyst, or viewer.");
    }
  }

  if (!partial || payload.password !== undefined) {
    if (!payload.password || payload.password.length < 8) {
      errors.push("Password must be at least 8 characters long.");
    }
  }

  return errors;
}

function validateRecordPayload(payload, { partial = false } = {}) {
  const errors = [];
  const allowedTypes = ["income", "expense"];

  if (!partial || payload.amount !== undefined) {
    if (typeof payload.amount !== "number" || Number.isNaN(payload.amount) || payload.amount <= 0) {
      errors.push("Amount must be a positive number.");
    }
  }

  if (!partial || payload.type !== undefined) {
    if (!allowedTypes.includes(payload.type)) {
      errors.push("Type must be income or expense.");
    }
  }

  if (!partial || payload.category !== undefined) {
    if (!payload.category || payload.category.trim().length < 2) {
      errors.push("Category must be at least 2 characters long.");
    }
  }

  if (!partial || payload.recordDate !== undefined) {
    if (!payload.recordDate || Number.isNaN(Date.parse(payload.recordDate))) {
      errors.push("A valid record date is required.");
    }
  }

  return errors;
}

module.exports = {
  validateRecordPayload,
  validateUserPayload,
};
