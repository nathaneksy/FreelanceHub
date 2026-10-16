"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import {
  one,
  run,
  hashPassword,
  verifyPassword,
  tokenHash,
  projectFor,
  db,
} from "../lib/db";
import { requireUser } from "../lib/auth";
const text = (f, k, max = 200) =>
  String(f.get(k) || "")
    .trim()
    .slice(0, max);
const fail = (path, message) =>
  redirect(
    path +
      (path.includes("?") ? "&" : "?") +
      "error=" +
      encodeURIComponent(message),
  );
export async function authenticate(f) {
  const mode = text(f, "mode"),
    email = text(f, "email").toLowerCase(),
    password = String(f.get("password") || ""),
    name = text(f, "name");
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    password.length < 10 ||
    password.length > 128
  )
    fail("/login", "Use a valid email and a password of 10–128 characters.");
  let user = one("SELECT * FROM users WHERE email=?", email);
  if (mode === "register") {
    if (!name || user)
      fail("/login", "Enter a name and an unused email address.");
    const invite = text(f, "invite"),
      client = invite
        ? one(
            "SELECT * FROM clients WHERE invite=? AND user_id IS NULL AND archived=0",
            invite,
          )
        : null;
    if (invite && (!client || client.email.toLowerCase() !== email))
      fail("/login", "Invitation is invalid or does not match your email.");
    db.exec("BEGIN IMMEDIATE");
    try {
      const result = run(
        "INSERT INTO users(name,email,password,role) VALUES(?,?,?,?)",
        name,
        email,
        hashPassword(password),
        client ? "client" : "freelancer",
      );
      if (client)
        run(
          "UPDATE clients SET user_id=?,invite=NULL WHERE id=?",
          Number(result.lastInsertRowid),
          client.id,
        );
      db.exec("COMMIT");
      user = one("SELECT * FROM users WHERE email=?", email);
    } catch {
      db.exec("ROLLBACK");
      fail("/login", "Could not create account. Please try again.");
    }
  } else if (!user || !verifyPassword(password, user.password))
    fail("/login", "Email or password is incorrect.");
  const token = randomBytes(32).toString("hex");
  run(
    "INSERT INTO sessions VALUES(?,?,?)",
    tokenHash(token),
    user.id,
    Date.now() + 604800000,
  );
  (await cookies()).set("fh_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 604800,
  });
  redirect("/");
}
export async function logout() {
  const c = await cookies(),
    token = c.get("fh_session")?.value;
  if (token) run("DELETE FROM sessions WHERE token=?", tokenHash(token));
  c.delete("fh_session");
  redirect("/login");
}
export async function mutate(f) {
  const u = await requireUser(),
    kind = text(f, "kind"),
    id = Number(f.get("id")),
    projectId = Number(f.get("project_id"));
  let path = "/";
  if (kind === "profile") {
    const name = text(f, "name");
    if (!name) fail("/?view=settings", "Name is required.");
    run("UPDATE users SET name=? WHERE id=?", name, u.id);
    path = "/?view=settings";
  } else if (
    kind === "message" ||
    kind === "message-edit" ||
    kind === "message-delete"
  ) {
    const p = projectFor(u, projectId);
    if (!p) fail("/", "Project unavailable.");
    path = "/?project=" + p.id;
    const content = text(f, "content", 2000);
    if (kind !== "message-delete" && !content)
      fail(path, "Write a message first.");
    if (kind === "message")
      run(
        "INSERT INTO messages(project_id,sender_id,content) VALUES(?,?,?)",
        p.id,
        u.id,
        content,
      );
    else {
      const m = one(
        "SELECT * FROM messages WHERE id=? AND project_id=?",
        id,
        p.id,
      );
      if (!m || (m.sender_id !== u.id && p.owner_id !== u.id))
        fail(path, "You cannot change this message.");
      if (kind === "message-delete") run("DELETE FROM messages WHERE id=?", id);
      else run("UPDATE messages SET content=? WHERE id=?", content, id);
    }
  } else {
    if (u.role !== "freelancer")
      fail("/", "Only the workspace owner can make this change.");
    if (kind === "client" || kind === "client-edit") {
      const name = text(f, "name"),
        email = text(f, "email").toLowerCase();
      path = "/?view=clients";
      if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        fail(path, "Client name and valid email are required.");
      if (kind === "client")
        run(
          "INSERT INTO clients(owner_id,name,email,invite) VALUES(?,?,?,?)",
          u.id,
          name,
          email,
          randomBytes(24).toString("hex"),
        );
      else
        run(
          "UPDATE clients SET name=?,email=? WHERE id=? AND owner_id=?",
          name,
          email,
          id,
          u.id,
        );
    } else if (kind === "client-archive") {
      run("UPDATE clients SET archived=1 WHERE id=? AND owner_id=?", id, u.id);
      path = "/?view=clients";
    } else if (kind === "project" || kind === "project-edit") {
      const client = one(
          "SELECT * FROM clients WHERE id=? AND owner_id=? AND archived=0",
          Number(f.get("client_id")),
          u.id,
        ),
        name = text(f, "name"),
        deadline = text(f, "deadline"),
        status = text(f, "status"),
        progress = Number(f.get("progress"));
      if (
        !client ||
        !name ||
        !["Planning", "In progress", "In review", "Completed"].includes(
          status,
        ) ||
        !Number.isInteger(progress) ||
        progress < 0 ||
        progress > 100 ||
        (deadline && !/^\d{4}-\d{2}-\d{2}$/.test(deadline))
      )
        fail(
          "/?view=projects",
          "Check project name, client, status, deadline and progress.",
        );
      if (kind === "project") {
        const r = run(
          "INSERT INTO projects(owner_id,client_id,name,description,deadline,status,progress) VALUES(?,?,?,?,?,?,?)",
          u.id,
          client.id,
          name,
          text(f, "description", 2000),
          deadline,
          status,
          progress,
        );
        path = "/?project=" + r.lastInsertRowid;
      } else {
        run(
          "UPDATE projects SET client_id=?,name=?,description=?,deadline=?,status=?,progress=? WHERE id=? AND owner_id=?",
          client.id,
          name,
          text(f, "description", 2000),
          deadline,
          status,
          progress,
          id,
          u.id,
        );
        path = "/?project=" + id;
      }
    } else {
      const p = projectFor(u, projectId);
      if (!p) fail("/", "Project unavailable.");
      path = "/?project=" + p.id;
      if (kind === "project-archive") {
        run("UPDATE projects SET archived=1 WHERE id=?", p.id);
        path = "/?view=projects";
      } else if (kind === "task" || kind === "task-edit") {
        const title = text(f, "title"),
          type = text(f, "type");
        if (!title || !["Task", "Milestone"].includes(type))
          fail(path, "Enter a title and work item type.");
        if (kind === "task")
          run(
            "INSERT INTO tasks(project_id,title,type,due,visible) VALUES(?,?,?,?,?)",
            p.id,
            title,
            type,
            text(f, "due"),
            f.get("visible") ? 1 : 0,
          );
        else
          run(
            "UPDATE tasks SET title=?,type=?,due=?,visible=? WHERE id=? AND project_id=?",
            title,
            type,
            text(f, "due"),
            f.get("visible") ? 1 : 0,
            id,
            p.id,
          );
      } else if (kind === "task-toggle")
        run(
          "UPDATE tasks SET done=1-done WHERE id=? AND project_id=?",
          id,
          p.id,
        );
      else if (kind === "task-delete") {
        if (f.get("confirm") !== "yes")
          fail(path, "Confirm permanent deletion.");
        run("DELETE FROM tasks WHERE id=? AND project_id=?", id, p.id);
      }
    }
  }
  revalidatePath("/");
  redirect(path);
}
