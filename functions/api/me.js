import { getCookie, SESS } from "../_shared/cookies.js";
import { sha256b64url } from "../_shared/crypto.js";

const H = { "Cache-Control": "no-store" };

export async function onRequestGet({ request, env }) {
  const raw = getCookie(request, SESS);
  if (!raw) return Response.json({ error: "unauthenticated" }, { status: 401, headers: H });
  const idHash = await sha256b64url(raw);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    "SELECT issuer, subject, email, display_name FROM sessions WHERE id_hash = ?1 AND expires_at > ?2"
  ).bind(idHash, now).first();
  if (!row) return Response.json({ error: "unauthenticated" }, { status: 401, headers: H });
  return Response.json(
    { issuer: row.issuer, subject: row.subject, email: row.email, displayName: row.display_name },
    { headers: H }
  );
}
