import { requireUser } from "../lib/auth";
import { all, projectFor, tasksFor } from "../lib/db";
import { logout, mutate } from "./actions";
const statuses = ["Planning", "In progress", "In review", "Completed"];
function Field({ label, name, value = "", type = "text", required = false }) {
  return (
    <label>
      {label}
      <input name={name} type={type} defaultValue={value} required={required} />
    </label>
  );
}
function Action({ kind, id, project, children, className = "" }) {
  return (
    <form action={mutate} className={className}>
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="project_id" value={project} />
      {children}
    </form>
  );
}
function ProjectForm({ clients, p = {} }) {
  return (
    <Action kind={p.id ? "project-edit" : "project"} id={p.id}>
      <div className="form-grid">
        <Field label="Project name" name="name" value={p.name} required />
        <label>
          Client
          <select name="client_id" defaultValue={p.client_id}>
            {clients
              .filter((c) => !c.archived)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <Field
          label="Deadline"
          name="deadline"
          type="date"
          value={p.deadline}
        />
        <label>
          Status
          <select name="status" defaultValue={p.status || "Planning"}>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label>
          Progress (%)
          <input
            name="progress"
            type="number"
            min="0"
            max="100"
            defaultValue={p.progress || 0}
            required
          />
        </label>
      </div>
      <label>
        Description
        <textarea
          name="description"
          defaultValue={p.description}
          maxLength={2000}
        />
      </label>
      <button>Save project ↗</button>
    </Action>
  );
}
function WorkForm({ p, t = {} }) {
  return (
    <Action kind={t.id ? "task-edit" : "task"} id={t.id} project={p.id}>
      <div className="form-grid">
        <Field label="Title" name="title" value={t.title} required />
        <label>
          Type
          <select name="type" defaultValue={t.type || "Task"}>
            <option>Task</option>
            <option>Milestone</option>
          </select>
        </label>
        <Field label="Due date" name="due" type="date" value={t.due} />
        <label className="check">
          <input
            type="checkbox"
            name="visible"
            defaultChecked={t.visible ?? true}
          />{" "}
          Visible to client
        </label>
      </div>
      <button>Save work item</button>
    </Action>
  );
}
export default async function Home({ searchParams }) {
  const u = await requireUser(),
    q = await searchParams,
    owner = u.role === "freelancer",
    view = q.view || "overview";
  const clients = owner
    ? all("SELECT * FROM clients WHERE owner_id=? ORDER BY archived,name", u.id)
    : [];
  const projects = owner
    ? all(
        "SELECT p.*,c.name AS client_name,c.archived AS client_archived FROM projects p JOIN clients c ON c.id=p.client_id WHERE p.owner_id=? ORDER BY p.archived,p.deadline",
        u.id,
      )
    : all(
        "SELECT p.*,c.name AS client_name,c.archived AS client_archived FROM projects p JOIN clients c ON c.id=p.client_id WHERE c.user_id=? ORDER BY p.archived,p.deadline",
        u.id,
      );
  const active = projects.filter((p) => !p.archived && !p.client_archived),
    p = q.project ? projectFor(u, Number(q.project)) : null;
  const tasks = p ? tasksFor(u, p) : [],
    messages = p
      ? all(
          "SELECT m.*,u.name AS sender FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.project_id=? ORDER BY m.id",
          p.id,
        )
      : [];
  const avg = active.length
    ? Math.round(active.reduce((s, p) => s + p.progress, 0) / active.length)
    : 0;
  return (
    <div className="workspace">
      <aside>
        <a href="/" className="brand">
          f
          <span>
            FreelanceHub<small>ROOM TO DO YOUR BEST WORK</small>
          </span>
        </a>
        <span className="nav-label">WORKSPACE</span>
        <nav>
          {[
            ["overview", "◫", "Overview"],
            ["projects", "▤", "Projects"],
            ...(owner ? [["clients", "♧", "Clients"]] : []),
            ["settings", "⚙", "Settings"],
          ].map(([key, icon, label]) => (
            <a
              key={key}
              className={!q.project && view === key ? "active" : ""}
              href={"/?view=" + key}
            >
              <span>{icon}</span>
              {label}
              {key === "projects" && <b>{active.length}</b>}
            </a>
          ))}
        </nav>
        <div className="sidebar-note">
          <span>✳</span>
          <strong>Good things take focus.</strong>
          <p>Keep your work moving, one small step at a time.</p>
        </div>
        <div className="account">
          <span className="avatar">{u.name[0].toUpperCase()}</span>
          <div>
            <strong>{u.name}</strong>
            <small>{owner ? "Freelancer workspace" : "Client workspace"}</small>
          </div>
        </div>
        <form action={logout}>
          <button className="text-button">Sign out ↗</button>
        </form>
      </aside>
      <div className="main">
        <header>
          <span>
            Workspace{" "}
            <span className="muted">
              / {p ? "Projects" : view[0].toUpperCase() + view.slice(1)}
            </span>
          </span>
          <span className="header-right">
            <i className="dot" />{" "}
            {owner ? "Independent, together" : "Your client portal"}{" "}
            <span className="avatar small">{u.name[0].toUpperCase()}</span>
          </span>
        </header>
        <main className="content">
          {q.error && (
            <p role="alert" className="alert">
              {q.error}
            </p>
          )}
          {q.project && !p ? (
            <section className="panel">
              <h1>Project unavailable</h1>
              <p>This project does not exist or you do not have access.</p>
              <a href="/">Back to your workspace</a>
            </section>
          ) : p ? (
            <>
              <a className="back" href="/?view=projects">
                ← All projects
              </a>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">PROJECT WORKSPACE</span>
                  <h1>{p.name}</h1>
                  <p>{p.description || "A shared space for the work ahead."}</p>
                </div>
                <span className="badge">
                  {p.archived ? "Archived" : p.status}
                </span>
              </div>
              <div className="panel project-summary">
                <span>
                  Deadline <strong>{p.deadline || "Not set"}</strong>
                </span>
                <span>
                  Progress <strong>{p.progress}%</strong>
                </span>
                <progress value={p.progress} max="100" />
              </div>
              {owner && (
                <details className="panel">
                  <summary>Edit project details</summary>
                  <ProjectForm clients={clients} p={p} />
                  <Action kind="project-archive" project={p.id}>
                    <button className="text-button danger">
                      Archive project
                    </button>
                  </Action>
                </details>
              )}
              <div className="detail-grid">
                <section className="panel">
                  <div className="section-title">
                    <h2>Tasks & milestones</h2>
                    <span className="muted">
                      {tasks.filter((t) => t.done).length} / {tasks.length} done
                    </span>
                  </div>
                  {!tasks.length && (
                    <p className="empty">
                      No work items yet. A clear next step makes all the
                      difference.
                    </p>
                  )}
                  {tasks.map((t) => (
                    <div className="work-item" key={t.id}>
                      <div className="item-heading">
                        {owner ? (
                          <Action kind="task-toggle" id={t.id} project={p.id}>
                            <button
                              className={"toggle " + (t.done ? "done" : "")}
                              aria-label={
                                t.done ? "Mark incomplete" : "Mark complete"
                              }
                            >
                              {t.done ? "✓" : "○"}
                            </button>
                          </Action>
                        ) : (
                          <span>{t.done ? "✓" : "○"}</span>
                        )}
                        <strong className={t.done ? "strike" : ""}>
                          {t.title}
                        </strong>
                      </div>
                      <small>
                        {t.type} · {t.due || "No deadline"} ·{" "}
                        {t.visible ? "Client visible" : "Internal"}
                      </small>
                      {owner && (
                        <details>
                          <summary>Edit work item</summary>
                          <WorkForm p={p} t={t} />
                          <Action kind="task-delete" id={t.id} project={p.id}>
                            <label className="check">
                              <input
                                type="checkbox"
                                name="confirm"
                                value="yes"
                                required
                              />{" "}
                              Permanently delete this item
                            </label>
                            <button className="text-button danger">
                              Delete item
                            </button>
                          </Action>
                        </details>
                      )}
                    </div>
                  ))}
                  {owner && (
                    <details className="add-details">
                      <summary>＋ Add a task or milestone</summary>
                      <WorkForm p={p} />
                    </details>
                  )}
                </section>
                <section className="panel">
                  <h2>Project conversation</h2>
                  <p className="muted">
                    A little context keeps everyone in sync.
                  </p>
                  {!messages.length && (
                    <p className="empty">
                      Start the conversation with a project update.
                    </p>
                  )}
                  {messages.map((m) => (
                    <article className="message" key={m.id}>
                      <strong>{m.sender}</strong>
                      <time>{m.created} UTC</time>
                      <p>{m.content}</p>
                      {(owner || m.sender_id === u.id) && (
                        <details>
                          <summary>Edit message</summary>
                          <Action kind="message-edit" id={m.id} project={p.id}>
                            <textarea
                              name="content"
                              defaultValue={m.content}
                              required
                              maxLength={2000}
                            />
                            <button>Save message</button>
                          </Action>
                          <Action
                            kind="message-delete"
                            id={m.id}
                            project={p.id}
                          >
                            <button className="text-button danger">
                              Delete message
                            </button>
                          </Action>
                        </details>
                      )}
                    </article>
                  ))}
                  <Action kind="message" project={p.id}>
                    <label>
                      Your update
                      <textarea
                        placeholder="Share an update or ask a question…"
                        name="content"
                        required
                        maxLength={2000}
                      />
                    </label>
                    <button>Post message ↗</button>
                  </Action>
                </section>
              </div>
            </>
          ) : view === "clients" && owner ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">PEOPLE BEHIND THE PROJECTS</span>
                  <h1>Your clients.</h1>
                  <p>Good relationships, all in one place.</p>
                </div>
              </div>
              <details className="panel">
                <summary>＋ Add a client</summary>
                <Action kind="client">
                  <div className="form-grid">
                    <Field
                      label="Client or company name"
                      name="name"
                      required
                    />
                    <Field
                      label="Contact email"
                      name="email"
                      type="email"
                      required
                    />
                  </div>
                  <button>Add client</button>
                </Action>
              </details>
              <div className="client-grid">
                {clients.map((c) => (
                  <section className="panel" key={c.id}>
                    <span className="client-icon">{c.name[0]}</span>
                    <h2>{c.name}</h2>
                    <p>{c.email}</p>
                    <span className="badge">
                      {c.archived
                        ? "Archived"
                        : c.user_id
                          ? "Account linked"
                          : "Awaiting invitation"}
                    </span>
                    {!c.archived && (
                      <>
                        <details>
                          <summary>Edit contact</summary>
                          <Action kind="client-edit" id={c.id}>
                            <Field
                              label="Name"
                              name="name"
                              value={c.name}
                              required
                            />
                            <Field
                              label="Email"
                              name="email"
                              type="email"
                              value={c.email}
                              required
                            />
                            <button>Save client</button>
                          </Action>
                        </details>
                        {!c.user_id && (
                          <details>
                            <summary>Client invitation</summary>
                            <p>
                              Share this code privately with {c.email}. They
                              must register using that email.
                            </p>
                            <code className="invite">{c.invite}</code>
                            <a href={"/login?invite=" + c.invite}>
                              Open registration link ↗
                            </a>
                          </details>
                        )}
                        <Action kind="client-archive" id={c.id}>
                          <button className="text-button danger">
                            Archive client
                          </button>
                        </Action>
                      </>
                    )}
                  </section>
                ))}
              </div>
              {!clients.length && (
                <section className="panel empty">
                  Add your first client to start a project.
                </section>
              )}
            </>
          ) : view === "settings" ? (
            <>
              <span className="eyebrow">MAKE YOURSELF AT HOME</span>
              <h1>Your profile.</h1>
              <section className="panel narrow">
                <Action kind="profile">
                  <Field
                    label="Your name"
                    name="name"
                    value={u.name}
                    required
                  />
                  <p>
                    {u.email} · {u.role}
                  </p>
                  <button>Save profile</button>
                </Action>
              </section>
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {view === "projects"
                      ? "A HOME FOR EVERY PROJECT"
                      : "YOUR WORK, A LITTLE MORE IN SYNC"}
                  </span>
                  <h1>
                    {view === "projects"
                      ? "The work ahead."
                      : `Welcome back, ${u.name.split(" ")[0]}.`}
                  </h1>
                  <p>
                    {owner
                      ? "Here’s where things stand. Let’s keep the good work going."
                      : "Your projects, progress, and conversations, together."}
                  </p>
                </div>
                {owner && (
                  <a className="button" href="/?view=projects#new-project">
                    ＋ New project
                  </a>
                )}
              </div>
              {view === "overview" && (
                <>
                  <div className="stats">
                    <section>
                      <span>
                        Active projects <b>↗</b>
                      </span>
                      <strong>
                        {active.length.toString().padStart(2, "0")}
                      </strong>
                      <small>Ideas turning into something real</small>
                    </section>
                    <section>
                      <span>
                        {owner ? "Active clients" : "Completed projects"}{" "}
                        <b>♧</b>
                      </span>
                      <strong>
                        {(owner
                          ? clients.filter((c) => !c.archived).length
                          : active.filter((p) => p.status === "Completed")
                              .length
                        )
                          .toString()
                          .padStart(2, "0")}
                      </strong>
                      <small>
                        {owner
                          ? "Relationships worth building"
                          : "A little celebration is in order"}
                      </small>
                    </section>
                    <section>
                      <span>
                        Overall progress <b>◴</b>
                      </span>
                      <strong>
                        {avg}
                        <em>%</em>
                      </strong>
                      <small>One step closer, every day</small>
                    </section>
                  </div>
                  <div className="focus-banner">
                    <span className="focus-icon">✳</span>
                    <div>
                      <span className="eyebrow">A LITTLE SPACE TO FOCUS</span>
                      <h2>Big projects. Clear next steps.</h2>
                      <p>
                        Keep the details here, so you can give the work your
                        attention.
                      </p>
                    </div>
                    <span className="banner-art">↗</span>
                  </div>
                </>
              )}
              <section className="panel">
                <div className="section-title">
                  <div>
                    <h2>
                      {view === "projects" ? "All projects" : "On your radar"}
                    </h2>
                    <p className="muted">
                      {view === "projects"
                        ? "Your active work and project history."
                        : "A shared view of what’s moving forward."}
                    </p>
                  </div>
                  {view === "overview" && (
                    <a href="/?view=projects">View all projects ↗</a>
                  )}
                </div>
                <div className="project-list">
                  {(view === "projects" ? projects : active.slice(0, 5)).map(
                    (p, i) => (
                      <a
                        className="project-row"
                        href={"/?project=" + p.id}
                        key={p.id}
                      >
                        <span className={"project-icon color-" + (i % 3)}>
                          {p.name[0]}
                        </span>
                        <div className="project-name">
                          <strong>{p.name}</strong>
                          <small>{p.client_name}</small>
                        </div>
                        <span className="badge">
                          {p.archived || p.client_archived
                            ? "Archived"
                            : p.status}
                        </span>
                        <span className="row-progress">
                          <span>{p.progress}%</span>
                          <progress max="100" value={p.progress} />
                        </span>
                        <span className="deadline">
                          {p.deadline || "No deadline"}
                        </span>
                        <span>↗</span>
                      </a>
                    ),
                  )}
                </div>
                {!(view === "projects" ? projects : active).length && (
                  <div className="empty">
                    <h3>A fresh start looks good on you.</h3>
                    <p>
                      {owner
                        ? "Add a client, then create your first project."
                        : "Your freelancer’s projects will appear here once assigned."}
                    </p>
                    {owner && (
                      <a href="/?view=clients">Add your first client ↗</a>
                    )}
                  </div>
                )}
              </section>
              {owner && view === "projects" && (
                <section className="panel" id="new-project">
                  <span className="eyebrow">SOMETHING NEW STARTS HERE</span>
                  <h2>Create a project</h2>
                  {clients.some((c) => !c.archived) ? (
                    <ProjectForm clients={clients} />
                  ) : (
                    <p>
                      <a href="/?view=clients">Add a client</a> before creating
                      a project.
                    </p>
                  )}
                </section>
              )}
            </>
          )}
          <footer>
            FreelanceHub{" "}
            <span>A little more organized. A lot more possible.</span>
            <small>BAKEOFF 01 · PROTOTYPE</small>
          </footer>
        </main>
      </div>
    </div>
  );
}
