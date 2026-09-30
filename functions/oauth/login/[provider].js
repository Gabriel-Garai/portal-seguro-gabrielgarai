import { getProvider, notFound, NO_STORE } from "../../_shared/providers.js";
import { randomB64url, sha256b64url } from "../../_shared/crypto.js";
import { txCookie } from "../../_shared/cookies.js";

export async function onRequestGet({ params, env }) {
  const name = params.provider;
  const p = getProvider(name);
  if (!p) return notFound();

  const txId = randomB64url();
  const state = randomB64url();
  const verifier = randomB64url();
  const nonce = name === "google" ? randomB64url() : null;
  const challenge = await sha256b64url(verifier);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare("DELETE FROM oauth_transactions WHERE expires_at < ?1").bind(now).run();
  await env.DB.prepare(
    "INSERT INTO oauth_transactions (id_hash, provider, state_hash, nonce, code_verifier, expires_at) VALUES (?1,?2,?3,?4,?5,?6)"
  ).bind(await sha256b64url(txId), name, await sha256b64url(state), nonce, verifier, now + 600).run();

  const u = new URL(p.authorize);
  u.searchParams.set("client_id", env[p.idKey]);
  u.searchParams.set("redirect_uri", `${env.PUBLIC_BASE_URL}/oauth/callback/${name}`);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("state", state);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  if (name === "google") {
    u.searchParams.set("scope", "openid email profile");
    u.searchParams.set("nonce", nonce);
  }

  const headers = new Headers(NO_STORE);
  headers.set("Location", u.toString());
  headers.append("Set-Cookie", txCookie(txId));
  return new Response(null, { status: 302, headers });
}
