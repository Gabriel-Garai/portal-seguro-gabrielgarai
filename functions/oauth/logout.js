import { getCookie, SESS, clearSess } from "../_shared/cookies.js";
import { sha256b64url } from "../_shared/crypto.js";

const H = { "Cache-Control": "no-store" };

export async function onRequestPost({ request, env }) {
  if (request.headers.get("Origin") !== env.PUBLIC_BASE_URL) {
    return new Response("Origem inválida.", { status: 403, headers: H });
  }
  const raw = getCookie(request, SESS);
  if (raw) {
    await env.DB.prepare("DELETE FROM sessions WHERE id_hash = ?1").bind(await sha256b64url(raw)).run();
  }
  const h = new Headers(H);
  h.set("Location", "/");
  h.append("Set-Cookie", clearSess());
  return new Response(null, { status: 303, headers: h });
}

export function onRequest() {
  return new Response("Método não permitido.", { status: 405, headers: { ...H, Allow: "POST" } });
}
