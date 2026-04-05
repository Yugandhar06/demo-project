const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { createPasswordHash } = require("./crypto");

const seedPath = path.join(process.cwd(), "data", "seeds.json");
const localStorePath = path.join(process.cwd(), "data", "store.json");
const tmpStorePath = path.join(os.tmpdir(), "financepro-store.json");

function getRuntimeStorePath() {
  return process.env.VERCEL ? tmpStorePath : localStorePath;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function loadSeeds() {
  const raw = await fs.readFile(seedPath, "utf8");
  const seeds = JSON.parse(raw);

  return {
    users: seeds.users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email.toLowerCase(),
      passwordHash: createPasswordHash(user.password),
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
    records: seeds.records,
    auditLogs: seeds.auditLogs || [],
    sessions: seeds.sessions || [],
  };
}

async function initializeStore() {
  const storePath = getRuntimeStorePath();
  const hasStore = await fileExists(storePath);

  if (hasStore) {
    return storePath;
  }

  const initialStore = await loadSeeds();
  await fs.writeFile(storePath, JSON.stringify(initialStore, null, 2), "utf8");
  return storePath;
}

async function readStore() {
  const storePath = await initializeStore();
  const raw = await fs.readFile(storePath, "utf8");
  return JSON.parse(raw);
}

async function writeStore(store) {
  const storePath = await initializeStore();
  await fs.writeFile(storePath, JSON.stringify(store, null, 2), "utf8");
  return store;
}

async function updateStore(mutator) {
  const store = await readStore();
  const updatedStore = await mutator(store);
  return writeStore(updatedStore);
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

module.exports = {
  readStore,
  sanitizeUser,
  updateStore,
};
