export const PROVIDERS = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    idKey: "GOOGLE_CLIENT_ID",
    secretKey: "GOOGLE_CLIENT_SECRET",
  },
  github: {
    authorize: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    idKey: "GITHUB_CLIENT_ID",
    secretKey: "GITHUB_CLIENT_SECRET",
  },
};
export function getProvider(name) {
  return name === "google" || name === "github" ? PROVIDERS[name] : null;
}
export const NO_STORE = { "Cache-Control": "no-store" };
export function notFound() {
  return new Response("Not found", { status: 404, headers: NO_STORE });
}
