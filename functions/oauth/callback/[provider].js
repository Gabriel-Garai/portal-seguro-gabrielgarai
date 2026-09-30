import { getProvider, notFound, NO_STORE } from "../../_shared/providers.js";
import { randomB64url, sha256b64url } from "../../_shared/crypto.js";
import { getCookie, TX, clearTx, sessCookie } from "../../_shared/cookies.js";
import { verifyGoogleIdToken } from "../../_shared/oidc.js";

function fail(status = 400) {
  const h = new Headers({ ...NO_STORE, "Content-Type": "text/plain; charset=utf-8" });
  h.append("Set-Cookie", clearTx());
  return new Response("Falha na autenticação.", { status, headers: h });
}

export async function onRequestGet({ request, params, env }) {
  const name = params.provider;
  const p = getProvider(name);
  if (!p) return notFound();

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (url.searchParams.get("error") || !code || !state) return fail();

    const txId = getCookie(request, TX);
    if (!txId) return fail();

    const idHash = await sha256b64url(txId);
    const now = Math.floor(Date.now() / 1000);
    const tx = await env.DB.prepare(
      "SELECT provider, state_hash, nonce, code_verifier FROM oauth_transactions WHERE id_hash = ?1 AND expires_at > ?2"
    ).bind(idHash, now).first();

    // apaga a transação ANTES de qualquer outra coisa (uso único)
    await env.DB.prepare("DELETE FROM oauth_transactions WHERE id_hash = ?1").bind(idHash).run();

    if (!tx || tx.provider !== name) return fail();
    if ((await sha256b64url(state)) !== tx.state_hash) return fail();

    const clientId = env[p.idKey];
    const clientSecret = env[p.secretKey];
    const redirectUri = `${env.PUBLIC_BASE_URL}/oauth/callback/${name}`;

    const tokRes = await fetch(p.token, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
        code_verifier: tx.code_verifier,
      }),
    });
    if (!tokRes.ok) return fail();
    const tok = await tokRes.json();

    let issuer, subject, email = null, displayName = null;

    if (name === "google") {
      const c = await verifyGoogleIdToken(tok.id_token, clientId, tx.nonce);
      issuer = "https://accounts.google.com";
      subject = c.sub;
      email = c.email ?? null;
      displayName = c.name ?? null;
    } else {
      if (!tok.access_token || String(tok.token_type || "").toLowerCase() !== "bearer") return fail();
      const uRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tok.access_token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          "User-Agent": "oauth-pages-lab",
        },
      });
      if (uRes.status !== 200) return fail();
      const u = await uRes.json();
      if (!Number.isInteger(u.id)) return fail();

      // revoga a autorização; sem 204 não há sessão
      const rev = await fetch(`https://api.github.com/applications/${clientId}/grant`, {
        method: "DELETE",
        headers: {
          Authorization: "Basic " + btoa(`${clientId}:${clientSecret}`),
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2026-03-10",
          "Content-Type": "application/json",
          "User-Agent": "oauth-pages-lab",
        },
        body: JSON.stringify({ access_token: tok.access_token }),
      });
      if (rev.status !== 204) return fail();

      issuer = "https://github.com";
      subject = String(u.id);
      email = u.email ?? null;
      displayName = u.name || u.login || null;
    }

    const raw = randomB64url();
    await env.DB.prepare(
      "INSERT INTO sessions (id_hash, issuer, subject, email, display_name, expires_at, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)"
    ).bind(await sha256b64url(raw), issuer, subject, email, displayName, now + 28800, now).run();

    const h = new Headers(NO_STORE);
    h.set("Location", env.PUBLIC_BASE_URL + "/");
    h.append("Set-Cookie", clearTx());
    h.append("Set-Cookie", sessCookie(raw));
    return new Response(null, { status: 302, headers: h });
  } catch (_) {
    return fail(); // nunca registrar detalhes/tokens
  }
}
