function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function parseBody(req) {
  if (req.body && typeof req.body === "object") {
    return req.body;
  }

  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (!chunks.length) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function parseCookies(req) {
  const header = req.headers.cookie;

  if (!header) {
    return {};
  }

  return header.split(";").reduce((acc, cookie) => {
    const [rawKey, ...rest] = cookie.trim().split("=");
    acc[rawKey] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
}

function setCookie(res, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];

  if (options.maxAge !== undefined) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  parts.push(`Path=${options.path || "/"}`);
  parts.push("HttpOnly");
  parts.push("SameSite=Lax");

  // On Vercel, explicitly set domain to empty string for current domain
  if (process.env.VERCEL) {
    parts.push("Secure");
  } else if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }

  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearCookie(res, name) {
  setCookie(res, name, "", { maxAge: 0 });
}

module.exports = {
  clearCookie,
  parseBody,
  parseCookies,
  sendJson,
  setCookie,
};
