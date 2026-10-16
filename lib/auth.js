import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { one, tokenHash } from "./db";
export async function currentUser() {
  const token = (await cookies()).get("fh_session")?.value;
  return token
    ? one(
        "SELECT u.id,u.name,u.email,u.role FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=? AND s.expires>?",
        tokenHash(token),
        Date.now(),
      )
    : null;
}
export async function requireUser() {
  const u = await currentUser();
  if (!u) redirect("/login");
  return u;
}
