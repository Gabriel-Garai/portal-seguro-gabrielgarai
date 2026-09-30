import { b64urlToBytes } from "./crypto.js";

const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const DISCOVERY = "https://accounts.google.com/.well-known/openid-configuration";

export async function verifyGoogleIdToken(token, clientId, expectedNonce) {
  const parts = String(token || "").split(".");
  if (parts.length !== 3 || parts.some((p) => !p)) throw new Error("jwt_format");
  const dec = new TextDecoder();
  const header = JSON.parse(dec.decode(b64urlToBytes(parts[0])));
  if (header.alg !== "RS256" || !header.kid) throw new Error("jwt_alg");

  const disc = await (await fetch(DISCOVERY)).json();
  if (disc.issuer !== "https://accounts.google.com") throw new Error("discovery_issuer");
  const jwks = await (await fetch(disc.jwks_uri)).json();
  const jwk = (jwks.keys || []).find((k) => k.kid === header.kid && k.kty === "RSA");
  if (!jwk) throw new Error("jwk_not_found");

  const key = await crypto.subtle.importKey(
    "jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]
  );
  const ok = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5", key, b64urlToBytes(parts[2]),
    new TextEncoder().encode(parts[0] + "." + parts[1])
  );
  if (!ok) throw new Error("bad_signature");

  const c = JSON.parse(dec.decode(b64urlToBytes(parts[1])));
  const now = Math.floor(Date.now() / 1000);
  if (!ISSUERS.includes(c.iss)) throw new Error("iss");
  const aud = Array.isArray(c.aud) ? c.aud : [c.aud];
  if (!aud.includes(clientId)) throw new Error("aud");
  if (typeof c.exp !== "number" || c.exp <= now) throw new Error("exp");
  if (typeof c.iat !== "number" || c.iat > now + 300) throw new Error("iat");
  if (!expectedNonce || c.nonce !== expectedNonce) throw new Error("nonce");
  if (!c.sub || typeof c.sub !== "string") throw new Error("sub");
  return c;
}
