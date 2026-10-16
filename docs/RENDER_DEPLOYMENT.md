# Deploy FreelanceHub to Render

The app runs as a **Node Web Service**, not a Static Site. Use the `bakeoff-1` branch: `main` currently contains only the original specification. The GitHub repository root is this app's directory, so leave Render's Root Directory blank; do not enter `bakeoff1`.

## Free classroom demo

The included `render.yaml` configures a free service with temporary SQLite storage. Accounts, invitations, messages, and projects can disappear after a restart, redeploy, or instance replacement. Your local database is not uploaded. Use fictional information and create accounts on the deployed site. Free instances can spin down while idle, so the first visit may take time to load.

1. Commit and push the deployment files to `bakeoff-1`.
2. In Render, choose **New → Blueprint**, connect `nathaneksy/FreelanceHub`, and select branch **bakeoff-1**. Use `render.yaml` at the repository root.
3. Review the service configuration and confirm **Free** before creating it.
4. Wait for the deploy to become Live, then open the HTTPS `onrender.com` URL Render provides. Share that URL with classmates.

If using **New → Web Service** instead of a Blueprint, enter:

| Setting           | Value                                               |
| ----------------- | --------------------------------------------------- |
| Repository        | `nathaneksy/FreelanceHub`                           |
| Branch            | `bakeoff-1`                                         |
| Root Directory    | Leave blank                                         |
| Runtime           | Node                                                |
| Instance type     | Free                                                |
| Build command     | `npm ci --include=dev && npm test && npm run build` |
| Start command     | `npm start`                                         |
| Health check path | `/api/health`                                       |
| `NODE_VERSION`    | `24.15.0`                                           |
| `NODE_ENV`        | `production`                                        |
| `SQLITE_PATH`     | `data/freelancehub.sqlite`                          |

Render sets `PORT` automatically; Next.js uses it. The production start command binds to `0.0.0.0`. Keep `TEST_DB` unset. No database password or authentication secret is needed for the current opaque-session implementation. Use the HTTPS URL so secure authentication cookies work.

## Durable SQLite option — paid

Before creating the service, replace `plan: free` in `render.yaml` with `plan: starter`, add this block under the web service, and change the `SQLITE_PATH` value to `/var/data/freelancehub.sqlite`:

```yaml
disk:
  name: freelancehub-data
  mountPath: /var/data
  sizeGB: 1
```

This provisions paid resources; review Render's current charges before applying. Alternatively, choose a paid instance in the dashboard, add the disk with the same mount path, and set `SQLITE_PATH` there. If managed by a Blueprint, update its YAML too so subsequent syncs retain the intended configuration.

Keep one instance: a SQLite disk cannot be shared between service instances. Render mounts persistent disks only at runtime, so the app initializes SQLite lazily on its first database request, including the health check. Builds do not need access to the mounted disk. Moving from temporary to persistent storage starts a new database; it does not automatically copy existing data.

## Check before sharing

1. Open `/api/health`; expect HTTP 200 and `{"status":"ok"}`.
2. Register a new freelancer on the hosted site and add a fictional client, project, and two tasks (one visible and one internal).
3. In a separate browser profile, register the client using the invitation and matching email. Verify the internal task stays hidden and post a reply.
4. Sign out and back in to confirm HTTPS cookies work.
5. For the paid disk option, restart the service and verify the same data is still available. For the free option, be prepared to recreate the demo data.

If a deploy fails, inspect its Render build/runtime logs. Common causes are selecting `main`, setting Root Directory to `bakeoff1`, using an older Node version, or configuring a persistent path without its disk. This repository is deployment-ready; the live Render deployment must still be created and checked in your account.

References: [Next.js on Render](https://render.com/docs/deploy-nextjs-app), [web service ports and HTTPS](https://render.com/docs/web-services), [persistent disks](https://render.com/docs/disks), [free service limitations](https://render.com/docs/free), [Blueprint configuration](https://render.com/docs/blueprint-spec).

Local readiness checks (October 16, 2026): unit tests and production build passed. Production startup on `PORT=10000` with a separate `SQLITE_PATH` passed the health request and full Playwright freelancer/client workflow, including returning login and server authorization checks. The hosted Render environment still needs the post-deployment checks above. Browser tests can target another port by setting `E2E_BASE_URL`.
