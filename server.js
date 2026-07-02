// Snip – tiny URL shortener  (Bun, zero npm deps)
const PORT = parseInt(process.env.PORT ?? "3000");
const BASE_URL =
  process.env.BASE_URL ??
  (process.env.RAILWAY_PUBLIC_DOMAIN
    ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
    : `http://localhost:${PORT}`);
const PUBLIC_DIR = process.env.PUBLIC_DIR ?? null;

/** @type {Map<string, {code:string,url:string,shortUrl:string,hits:number,createdAt:string}>} */
const links = new Map();

// ── helpers ────────────────────────────────────────────────────────────────

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function generateCode() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => BASE62[b % 62]).join("");
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function tryStatic(pathname) {
  if (!PUBLIC_DIR) return null;
  const rel = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
  const file = Bun.file(`${PUBLIC_DIR.replace(/\/$/, "")}/${rel}`);
  return (await file.exists()) ? new Response(file, { headers: { ...CORS } }) : null;
}

// ── request handler ────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,

  async fetch(req) {
    const { pathname } = new URL(req.url);
    const method = req.method;

    // OPTIONS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // POST /api/links  →  create short link
    if (method === "POST" && pathname === "/api/links") {
      let body;
      try {
        body = await req.json();
      } catch {
        return json({ error: "Invalid JSON" }, 400);
      }

      let parsed;
      try {
        parsed = new URL(body?.url ?? "");
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw 0;
      } catch {
        return json({ error: "url must be a valid http(s) URL" }, 400);
      }

      let code;
      do { code = generateCode(); } while (links.has(code));

      const link = {
        code,
        url: parsed.href,
        shortUrl: `${BASE_URL}/${code}`,
        hits: 0,
        createdAt: new Date().toISOString(),
      };
      links.set(code, link);
      return json(link, 201);
    }

    // GET /api/links  →  list all links
    if (method === "GET" && pathname === "/api/links") {
      return json([...links.values()]);
    }

    // Static files win over short codes
    if (method === "GET") {
      const staticResp = await tryStatic(pathname);
      if (staticResp) return staticResp;
    }

    // GET /:code  →  302 redirect (hits++)
    if (method === "GET" && pathname.length > 1) {
      const code = pathname.slice(1);
      const link = links.get(code);
      if (link) {
        link.hits++;
        return new Response(null, {
          status: 302,
          headers: { ...CORS, Location: link.url },
        });
      }
      return json({ error: "Not found" }, 404);
    }

    return json({ error: "Not found" }, 404);
  },
});

console.log(`Snip listening on port ${server.port}`);
console.log(`BASE_URL : ${BASE_URL}`);
if (PUBLIC_DIR) console.log(`PUBLIC_DIR: ${PUBLIC_DIR}`);
