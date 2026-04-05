const crypto = require("node:crypto");

const ITERATIONS = 120000;
const KEY_LENGTH = 64;
const DIGEST = "sha512";

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString("hex");

  return `${ITERATIONS}:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) {
    return false;
  }

  const [iterationsRaw, salt, originalHash] = storedHash.split(":");
  const iterations = Number(iterationsRaw);

  if (!iterations || !salt || !originalHash) {
    return false;
  }

  const candidateHash = crypto
    .pbkdf2Sync(password, salt, iterations, KEY_LENGTH, DIGEST)
    .toString("hex");

  return crypto.timingSafeEqual(
    Buffer.from(candidateHash, "hex"),
    Buffer.from(originalHash, "hex")
  );
}

function createId(prefix) {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function createToken() {
  return crypto.randomBytes(24).toString("hex");
}

module.exports = {
  createId,
  createPasswordHash,
  createToken,
  verifyPassword,
};
