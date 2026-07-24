// Minimal static file server for Playwright e2e runs.
// Serves the pwa/ directory over HTTP so ES modules and the service worker load
// the same way they do in production. Not used by the node unit tests.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { extname, join, normalize } from "node:path";

const ROOT = fileURLToPath(new URL("../../pwa/", import.meta.url));
const PORT = process.env.E2E_PORT ? Number(process.env.E2E_PORT) : 4173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon"
};

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === "/" || pathname.endsWith("/")) {
      pathname += "index.html";
    }
    const relative = normalize(pathname).replace(/^[/\\]+/, "");
    const filePath = join(ROOT, relative);
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403).end("Forbidden");
      return;
    }
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`static server on http://127.0.0.1:${PORT}`);
});
