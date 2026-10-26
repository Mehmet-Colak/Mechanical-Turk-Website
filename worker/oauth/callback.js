// GET /oauth/callback — step 2 of CMS login.
// GitHub sends the editor back here with a one-time code. We swap it for an
// access token (using the secret, which never reaches the browser) and hand the
// token to the CMS window using the standard Decap/Sveltia popup handshake.

function page(origin, status, payload) {
  const message = `authorization:github:${status}:${JSON.stringify(payload)}`;
  // Escape "<" so nothing in the payload can close the <script> tag.
  const safe = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Signing in…</title></head>
<body style="font-family:monospace;padding:24px">
<p>${status === "success" ? "Signed in. You can close this window." : "Sign-in failed. You can close this window and try again."}</p>
<script>
(function () {
  var origin = ${safe(origin)};
  var message = ${safe(message)};
  if (!window.opener) return;
  function receive(event) {
    if (event.origin !== origin) return;
    window.opener.postMessage(message, origin);
    window.removeEventListener("message", receive, false);
    setTimeout(function () { window.close(); }, 300);
  }
  window.addEventListener("message", receive, false);
  window.opener.postMessage("authorizing:github", origin);
})();
</script></body></html>`;
  return new Response(html, {
    status: status === "success" ? 200 : 400,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Set-Cookie": "cms_oauth_state=; Path=/oauth; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  });
}

export async function handleCallback(request, env) {
  const url = new URL(request.url);
  const origin = url.origin;
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookie = request.headers.get("Cookie") || "";
  const expected = (cookie.match(/(?:^|;\s*)cms_oauth_state=([^;]+)/) || [])[1];

  if (url.searchParams.get("error")) {
    return page(origin, "error", { message: url.searchParams.get("error_description") || "Access was denied." });
  }
  if (!code || !state || !expected || state !== expected) {
    return page(origin, "error", { message: "Login session expired or was tampered with. Please try again." });
  }

  try {
    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json", "user-agent": "mechanical-turk-dev-cms" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${origin}/oauth/callback`,
      }),
    });
    const data = await res.json();
    if (!data.access_token) {
      return page(origin, "error", { message: data.error_description || "GitHub did not return a token." });
    }
    return page(origin, "success", { token: data.access_token, provider: "github" });
  } catch (err) {
    return page(origin, "error", { message: "Could not reach GitHub. Please try again." });
  }
}
