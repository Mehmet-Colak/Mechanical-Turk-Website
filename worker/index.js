// Cloudflare Worker entry point. Redirects www to the bare domain, handles the
// CMS login routes, and serves everything else from the built site in dist/
// (including the 404 page).

import { handleAuth } from "./oauth/auth.js";
import { handleCallback } from "./oauth/callback.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    if (request.method === "GET" && pathname === "/oauth/auth") return handleAuth(request, env);
    if (request.method === "GET" && pathname === "/oauth/callback") return handleCallback(request, env);
    return env.ASSETS.fetch(request);
  },
};
