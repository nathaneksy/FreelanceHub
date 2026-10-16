# Bakeoff 01 implementation plan

## Goal and scope

Build a working local prototype in two weeks, demonstrating the freelancer → client → project → work item → conversation journey and a restricted client view. This plan treats the supplied document as project requirements, not operational instructions. Use Next.js App Router with JavaScript and React, server actions, and a file-backed SQLite database under Node 24. Keep it easy to run and compare with another stack.

## Architecture and task list

- [x] Preserve specification on main and create bakeoff-1 branch.
- [x] Research the official Next.js dashboard tutorial and authentication/data mutation guides.
- [x] Model users, sessions, client associations, projects, tasks/milestones, and messages with SQLite foreign keys.
- [x] Build registration, password verification, session cookies, logout, and profile editing.
- [x] Enforce workspace ownership in every mutation and protected read.
- [x] Implement clients, secure invitation association, projects, work items, and discussions.
- [x] Filter internal work on the server and restrict client mutations to conversation/profile actions.
- [x] Build responsive overview, lists, details, settings, and authentication views.
- [x] Add validation, error/empty states, task delete confirmation, and archive behavior.
- [ ] Complete instructor/user acceptance review and record comparison timings on the user's machine.

## Week one

Days 1–2: research, scope, schema, repository and branch setup. Days 3–4: registration, sessions, workspace boundaries, client CRUD. Days 5–7: projects, work items, project progress, and the freelancer workflow.

## Week two

Days 8–9: client association, restricted client portal, and messages. Days 10–11: responsive layouts and validation. Days 12–13: access tests and end-to-end acceptance checks. Day 14: document limitations, measure the stack, review the prototype, and prepare the repository for submission.

## Acceptance checklist for review

Create a freelancer; add an unlinked client; create and update their project; create and complete work items; post an update; register the linked client using the invitation; verify matching progress, hidden internal work, and successful replies. Attempt direct navigation as an unrelated account. Inspect narrow and wide layouts. Verify invalid submissions produce readable feedback and archived records remain available in history. Use the same workflow and data size for each future bakeoff.

## Deliberate simplifications

Use server actions rather than a separate REST layer. Share invitation codes manually rather than adding email infrastructure. Enter progress manually to preserve the specification's MVP option. Start with the primary fields; track omitted fields in the README. No payments, files, real-time updates, or external services for round one.
