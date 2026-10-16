import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  createHash,
} from "node:crypto";
let db;
// Render disks are mounted only at runtime. Importing this module during a
// Next.js build must not create or open the production database.
export function getDb() {
  if (db) return db;
  const filename =
    process.env.TEST_DB ||
    process.env.SQLITE_PATH ||
    "data/freelancehub.sqlite";
  if (filename !== ":memory:")
    mkdirSync(dirname(filename), { recursive: true });
  db = new DatabaseSync(filename);
  db.exec(`PRAGMA busy_timeout=10000; PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id INTEGER REFERENCES users(id),expires INTEGER);
CREATE TABLE IF NOT EXISTS clients(id INTEGER PRIMARY KEY,owner_id INTEGER REFERENCES users(id),name TEXT NOT NULL,email TEXT NOT NULL,archived INTEGER DEFAULT 0,user_id INTEGER UNIQUE REFERENCES users(id),invite TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS projects(id INTEGER PRIMARY KEY,owner_id INTEGER REFERENCES users(id),client_id INTEGER REFERENCES clients(id),name TEXT NOT NULL,description TEXT,deadline TEXT,status TEXT DEFAULT 'Planning',progress INTEGER DEFAULT 0,archived INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS tasks(id INTEGER PRIMARY KEY,project_id INTEGER REFERENCES projects(id),title TEXT NOT NULL,type TEXT DEFAULT 'Task',due TEXT,visible INTEGER DEFAULT 1,done INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,project_id INTEGER REFERENCES projects(id),sender_id INTEGER REFERENCES users(id),content TEXT NOT NULL,created TEXT DEFAULT CURRENT_TIMESTAMP);`);
  return db;
}
export const one = (sql, ...args) =>
  getDb()
    .prepare(sql)
    .get(...args);
export const all = (sql, ...args) =>
  getDb()
    .prepare(sql)
    .all(...args);
export const run = (sql, ...args) =>
  getDb()
    .prepare(sql)
    .run(...args);
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  return timingSafeEqual(
    Buffer.from(hash, "hex"),
    scryptSync(password, salt, 64),
  );
}
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export function projectFor(user, id) {
  return user.role === "freelancer"
    ? one("SELECT * FROM projects WHERE id=? AND owner_id=?", id, user.id)
    : one(
        "SELECT p.* FROM projects p JOIN clients c ON p.client_id=c.id WHERE p.id=? AND c.user_id=?",
        id,
        user.id,
      );
}
export function tasksFor(user, project) {
  return all(
    "SELECT * FROM tasks WHERE project_id=? AND (?=1 OR visible=1) ORDER BY done,id",
    project.id,
    user.role === "freelancer" ? 1 : 0,
  );
}
