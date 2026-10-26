// Cloudflare Worker entry point. The built site in dist/ is served as static
// assets; this script only runs for requests that don't match a file, which is
// where the CMS login routes live. Everything else falls through to the assets
// (including the 404 page).

import { handleAuth } from "./oauth/auth.js";
import { handleCallback } from "./oauth/callback.js";

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (request.method === "GET" && pathname === "/oauth/auth") return handleAuth(request, env);
    if (request.method === "GET" && pathname === "/oauth/callback") return handleCallback(request, env);
    return env.ASSETS.fetch(request);
  },
};
