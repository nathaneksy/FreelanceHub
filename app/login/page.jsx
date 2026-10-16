import { authenticate } from "../actions";
import { currentUser } from "../../lib/auth";
import { redirect } from "next/navigation";
export default async function Login({ searchParams }) {
  if (await currentUser()) redirect("/");
  const q = await searchParams;
  return (
    <main className="auth">
      <section className="auth-story">
        <a className="brand" href="/">
          f<span>FreelanceHub</span>
        </a>
        <span className="eyebrow">LESS CHASING. MORE CREATING.</span>
        <h1>
          Good work starts
          <br />
          on the same page.
        </h1>
        <p>
          A calmer home for your client relationships, project plans, and the
          conversations that move work forward.
        </p>
        <div className="story-card">
          <span className="dot" /> YOUR NEXT CHAPTER
          <div className="fake-line" />
          <h2>Everything coming together.</h2>
          <p>One workspace. A shared sense of progress.</p>
        </div>
        <small>Built for independent people doing great work.</small>
      </section>
      <section className="auth-form">
        <span className="eyebrow">WELCOME TO YOUR WORKSPACE</span>
        <h2>Let’s get you settled in.</h2>
        <p>Sign in, or start your own freelance workspace.</p>
        {q.error && (
          <p role="alert" className="alert">
            {q.error}
          </p>
        )}
        <form action={authenticate}>
          <label>
            Email
            <input name="email" type="email" required autoComplete="email" />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={10}
              maxLength={128}
              required
              autoComplete="current-password"
            />
          </label>
          <button name="mode" value="login">
            Sign in <span>↗</span>
          </button>
          <details open={!!q.invite}>
            <summary>New here? Create an account</summary>
            <label>
              Your name
              <input name="name" autoComplete="name" />
            </label>
            <label>
              Invitation code <small>(clients only)</small>
              <input name="invite" defaultValue={q.invite || ""} />
            </label>
            <p className="muted">
              Use 10–128 characters for your password. Without an invitation,
              you’ll create a freelancer workspace.
            </p>
            <button name="mode" value="register">
              Create account ↗
            </button>
          </details>
        </form>
      </section>
    </main>
  );
}
