// GET /oauth/auth — step 1 of CMS login.
// Sends the editor to GitHub to approve access. Runs as a Cloudflare Pages Function.
// Needs the environment variable GITHUB_CLIENT_ID (see README → CMS authentication).

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const provider = url.searchParams.get("provider") || "github";

  if (provider !== "github") {
    return new Response("Only GitHub login is configured.", { status: 400 });
  }
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    return new Response(
      "CMS login is not configured yet: set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in Cloudflare Pages → Settings → Variables and Secrets, then redeploy.",
      { status: 500, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const state = crypto.randomUUID();
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${url.origin}/oauth/callback`);
  authorize.searchParams.set("scope", url.searchParams.get("scope") || "repo,user");
  authorize.searchParams.set("state", state);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": `cms_oauth_state=${state}; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
      "Cache-Control": "no-store",
    },
  });
}
