export const TX = "__Host-oauth-tx";
export const SESS = "__Host-session";

export function getCookie(request, name) {
  const h = request.headers.get("Cookie") || "";
  for (const part of h.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}
export const txCookie = (v) => `${TX}=${v}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`;
export const clearTx = () => `${TX}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
export const sessCookie = (v) => `${SESS}=${v}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`;
export const clearSess = () => `${SESS}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
