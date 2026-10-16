"use client";
export default function Error({ reset }) {
  return (
    <main className="content">
      <h1>Something interrupted your work.</h1>
      <p>Your last change may not have been saved. Try again.</p>
      <button onClick={reset}>Try again</button>
      <a href="/"> Return to workspace</a>
    </main>
  );
}
