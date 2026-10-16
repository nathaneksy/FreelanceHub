import { test } from "node:test";
import assert from "node:assert/strict";
process.env.TEST_DB = ":memory:";
const { db, run, projectFor, tasksFor, hashPassword, verifyPassword } =
  await import("../lib/db.js");
test("passwords are salted and verified", () => {
  const a = hashPassword("correct-horse-battery");
  assert.notEqual(a, hashPassword("correct-horse-battery"));
  assert.equal(verifyPassword("correct-horse-battery", a), true);
  assert.equal(verifyPassword("incorrect-password", a), false);
});
test("workspace boundaries, linked clients, and internal tasks are enforced in database reads", () => {
  run(
    "INSERT INTO users VALUES(1,'Owner','o@example.com','unused','freelancer'),(2,'Other','x@example.com','unused','freelancer'),(3,'Client','c@example.com','unused','client'),(4,'Stranger','s@example.com','unused','client')",
  );
  run(
    "INSERT INTO clients(id,owner_id,name,email,user_id) VALUES(1,1,'Client','c@example.com',3)",
  );
  run(
    "INSERT INTO projects(id,owner_id,client_id,name) VALUES(1,1,1,'Private project')",
  );
  run(
    "INSERT INTO tasks(project_id,title,visible) VALUES(1,'Public task',1),(1,'Internal task',0)",
  );
  const owner = { id: 1, role: "freelancer" },
    client = { id: 3, role: "client" };
  assert.equal(projectFor({ id: 2, role: "freelancer" }, 1), undefined);
  assert.equal(projectFor({ id: 4, role: "client" }, 1), undefined);
  assert.equal(projectFor(client, 1).name, "Private project");
  assert.equal(tasksFor(owner, projectFor(owner, 1)).length, 2);
  assert.deepEqual(
    tasksFor(client, projectFor(client, 1)).map((t) => t.title),
    ["Public task"],
  );
  assert.throws(
    () =>
      run(
        "INSERT INTO clients(owner_id,name,email,user_id) VALUES(2,'Duplicate','d@example.com',3)",
      ),
    /UNIQUE/,
  );
});
