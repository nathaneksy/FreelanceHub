# FreelanceHub — Bakeoff 01

A local, server-rendered prototype for freelancers and their clients. Built by Nathan Escujuri for WDD 430. The original specification is in `docs/FreelanceHub_Project_Specification.docx`.

## Run locally

Requires Node.js 24+ and npm. No external database account or environment secrets are required.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3000. Choose **New here? Create an account**, enter a name, email, and a password of 10–128 characters. Leave the invitation blank to create a freelancer workspace. Data persists in `data/freelancehub.sqlite`, which is excluded from Git. No demo credentials are created.

```sh
npm test
npm run build
npm start
```

To run the browser workflow with a server running on port 3000, run `npx playwright install chromium` once, then `npm run test:e2e`. An existing compatible Chromium can be selected with `PLAYWRIGHT_CHROMIUM_EXECUTABLE`. For isolated test data, start the server with `TEST_DB=data/e2e.sqlite` (PowerShell: `$env:TEST_DB='data/e2e.sqlite'` before `npm start`). Browser tests create fresh accounts and write screenshots to ignored `test-results/`.

Production sets secure cookies: use HTTPS for a deployed instance. Use `npm run dev` for local HTTP testing.

## Try both journeys

1. Register a freelancer, add a client with a different email, and create a project assigned to them.
2. Add a client-visible task, an internal task, and a milestone. Set project progress and post a message.
3. In Clients, expand **Client invitation** and copy the code. Sign out or open a separate browser profile.
4. Register using the client's exact email and invitation code. Client accounts can read assigned projects and visible work, and post messages. They cannot manage project data.
5. Return as the freelancer to complete work, edit messages, update progress, or archive clients/projects. Task deletion requires an explicit checkbox confirmation.
6. Register another freelancer and confirm their workspace starts empty. Opening another workspace's project URL must show “Project unavailable.”

## Stack and architecture

Next.js 16 App Router / React 19, JavaScript, CSS, and Node's built-in SQLite driver. React Server Components render current database data on each authenticated request. Server Actions perform mutations, validate input, check authorization, and revalidate views. There is no separate REST service for this bakeoff; the specification explicitly allows refinement of its proposed endpoints.

Passwords use salted scrypt hashes. Cookies contain opaque random session tokens; only their SHA-256 hashes are stored in SQLite. Sessions expire after seven days and logout revokes them. Client invitations use random, single-use codes tied to a contact email, with one account per client record. SQL queries are parameterized. Every action authenticates the caller and checks ownership or participation before changing protected records. Internal tasks are filtered on the server and never sent to client views.

## Implemented scope

- Registration, login, logout, profile name editing.
- Client create/read/update/archive and manual invitation sharing.
- Project create/read/update/archive, status, deadline, description, and manual progress.
- Tasks and milestones: create/edit/complete/delete, due dates, visibility.
- Role-specific overview, project details, and conversation; authors and owners may edit/delete messages.
- Responsive navigation, layouts, forms, empty states, and validation feedback.

## Deploy to Render

Use the included `render.yaml` on branch `bakeoff-1`, or follow the dashboard settings in [the Render deployment guide](docs/RENDER_DEPLOYMENT.md). The default is a **free classroom demo with temporary data**. A paid persistent-disk option is documented for keeping accounts and projects across restarts. The app uses `PORT` automatically and accepts `SQLITE_PATH` to select its database location. Your local database is excluded from Git and is not uploaded to Render.

## Prototype limits and next steps

This is a single-process prototype. Durable SQLite data requires a writable, persistent disk; the free Render configuration intentionally uses temporary storage for disposable classroom testing. Email delivery, password reset, email verification, login rate limiting, session management UI, and invitation expiry are future work. Invitations are shared manually; an unaccepted invitation remains valid until used or its client is archived. A linked client email can be updated as contact information; the user's login email does not change.

The proposal's richer profile details, project start dates, task descriptions/priorities/completion timestamps, archive restoration/filtering, and message edited timestamps are not yet implemented. Archiving hides projects from the active overview but retains them in project history and keeps participant discussion available. Client archiving also removes their projects from the active overview. Contact editing does not reassign linked accounts. Files, approvals, invoicing, payments, notifications, and calendars are deferred as specified.

## Research and comparison

Start with the official [Next.js dashboard course](https://nextjs.org/learn/dashboard-app), particularly [mutating data](https://nextjs.org/docs/app/getting-started/mutating-data) and [authentication guidance](https://nextjs.org/docs/app/guides/authentication). These demonstrate the same SSR, forms, and authorization concerns explored here; this prototype uses SQLite and opaque sessions instead of the course's database/auth stack. Database reference: [Node.js SQLite](https://nodejs.org/api/sqlite.html).

See `docs/IMPLEMENTATION_PLAN.md` for the two-week plan and `docs/BAKEOFF_NOTES.md` for measurement instructions and validation evidence. Dependency versions are pinned by `package-lock.json`. The repository starts with the specification on `main`; implementation is on `bakeoff-1`.
