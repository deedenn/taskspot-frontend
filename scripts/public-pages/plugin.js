import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PUBLIC_ROUTES, SITE_ORIGIN, getPublicPage } from "../../src/components/PublicPages/content.js";
import { downloads, DOWNLOAD_BASE } from "../../src/components/PublicPages/downloads.js";
import { escapeHtml, renderPublicDocument } from "../../src/components/PublicPages/renderer.js";

export const STYLESHEET_PATH = "assets/public-pages.css";

export function createPublicAssets(css) {
  const assets = new Map();
  const add = (name, source, type) => assets.set(name, { source, type });
  add(STYLESHEET_PATH, css, "text/css; charset=utf-8");
  for (const path of PUBLIC_ROUTES) {
    add(`${path.slice(1)}index.html`, renderPublicDocument(path), "text/html; charset=utf-8");
  }
  for (const file of downloads) {
    add(DOWNLOAD_BASE.slice(1) + file.filename, file.content, file.type);
  }
  const urls = ["/", ...PUBLIC_ROUTES];
  add("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((path) => `<url><loc>${escapeHtml(SITE_ORIGIN + path)}</loc></url>`).join("")}</urlset>\n`, "application/xml; charset=utf-8");
  add("robots.txt", `User-agent: *\nAllow: /\nDisallow: /app\nDisallow: /api\nDisallow: /login\nDisallow: /register\nDisallow: /forgot-password\nDisallow: /reset-password\nDisallow: /verify-email\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`, "text/plain; charset=utf-8");
  return assets;
}

export function publicPagesMiddleware(getAssets) {
  return async (req, res, next) => {
    if (!["GET", "HEAD"].includes(req.method)) return next();
    let url;
    try { url = new URL(req.url, "http://localhost"); } catch { return next(); }
    const path = url.pathname;
    const indexPath = path.endsWith("/index.html") ? path.slice(0, -10) : path;
    const page = getPublicPage(indexPath);
    if (page && path !== page.path) {
      res.statusCode = 301;
      res.setHeader("Location", page.path + url.search);
      res.end();
      return;
    }
    try {
      const assets = await getAssets();
      const fileName = page ? `${page.path.slice(1)}index.html` : path.slice(1);
      const asset = assets.get(fileName);
      if (!asset) {
        if (/^\/(solutions|resources)(\/|$)/.test(path)) {
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("X-Robots-Tag", "noindex");
          res.end(req.method === "HEAD" ? undefined : '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Страница не найдена | Taskspot</title><h1>Страница не найдена</h1><a href="/resources/">Статьи и шаблоны</a></html>');
          return;
        }
        return next();
      }
      res.setHeader("Content-Type", asset.type);
      if (path.startsWith(DOWNLOAD_BASE)) {
        res.setHeader("Content-Disposition", `attachment; filename="${path.slice(DOWNLOAD_BASE.length)}"`);
        res.setHeader("X-Robots-Tag", "noindex");
      }
      res.end(req.method === "HEAD" ? undefined : asset.source);
    } catch (error) { next(error); }
  };
}

export function publicPagesPlugin() {
  let cssFile;
  return {
    name: "taskspot-public-pages",
    configResolved(config) {
      if (config.base !== "/") throw new Error("Public pages require Vite base '/' to match canonical routes.");
      cssFile = resolve(config.root, "src/components/PublicPages/PublicPages.css");
    },
    configureServer(server) {
      server.middlewares.use(publicPagesMiddleware(async () => createPublicAssets(await readFile(cssFile, "utf8"))));
    },
    async generateBundle() {
      this.addWatchFile(cssFile);
      for (const [fileName, asset] of createPublicAssets(await readFile(cssFile, "utf8"))) {
        this.emitFile({ type: "asset", fileName, source: asset.source });
      }
    }
  };
}
