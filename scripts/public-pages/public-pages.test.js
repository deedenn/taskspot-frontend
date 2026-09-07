import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { articles, BRAND_IMAGE, getPublicPage, PUBLIC_ROUTES, publicPages, SITE_ORIGIN, solutions, templates } from "../../src/components/PublicPages/content.js";
import { DOWNLOAD_BASE, downloads } from "../../src/components/PublicPages/downloads.js";
import { escapeHtml, getPageMetadata, renderMetadata, renderPublicDocument, renderPublicPage, serializeJsonLd } from "../../src/components/PublicPages/renderer.js";
import { createPublicAssets, publicPagesMiddleware, publicPagesPlugin } from "./plugin.js";

test("catalog has six distinct scenarios, three articles, three real templates and two indexes", () => {
  assert.equal(solutions.length, 6);
  assert.deepEqual(solutions.map((page) => page.path.split("/")[2]), ["owner", "department", "production", "agencies", "retail", "remote"]);
  assert.equal(articles.length, 3);
  assert.equal(templates.length, 3);
  assert.equal(PUBLIC_ROUTES.length, 14);
  for (const key of ["path", "title", "description"]) {
    assert.equal(new Set(publicPages.map((page) => page[key])).size, publicPages.length);
  }
  for (const page of [...solutions, ...articles]) {
    const copy = JSON.stringify(page.sections);
    assert.ok(copy.length > 1200, `${page.path} must contain substantial original copy`);
    assert.ok(page.sections.length >= 3);
  }
});

test("route lookup accepts only exact catalog paths and a missing trailing slash", () => {
  for (const path of PUBLIC_ROUTES) {
    assert.equal(getPublicPage(path)?.path, path);
    assert.equal(getPublicPage(path.slice(0, -1))?.path, path);
  }
  for (const path of [null, {}, "/", "/app", "/resources/missing/", "/solutions/OWNER/", "//solutions/owner/", "/resources/../app/", '/resources/<img src=x onerror="alert(1)">/', "/solutions/owner/?x=1"]) {
    assert.equal(getPublicPage(path), undefined);
    assert.equal(renderPublicPage(path), null);
    assert.equal(renderPublicDocument(path), null);
    assert.equal(getPageMetadata(path), null);
  }
});

test("HTML and JSON data escaping prevents tag and script injection", () => {
  assert.equal(escapeHtml(`<img x="'">&`), "&lt;img x=&quot;&#39;&quot;&gt;&amp;");
  const value = { name: "</script><script>alert(1)</script>&" };
  const encoded = serializeJsonLd(value);
  assert.ok(!encoded.includes("<"));
  assert.deepEqual(JSON.parse(encoded), value);
});

test("every static document contains complete content, a bitmap, metadata and valid JSON-LD without executable JS", () => {
  for (const page of publicPages) {
    const html = renderPublicDocument(page.path);
    assert.ok(html.startsWith("<!doctype html>"));
    assert.match(html, /<html lang="ru">/);
    assert.equal((html.match(/<h1>/g) || []).length, 1);
    assert.equal((html.match(/<title>/g) || []).length, 1);
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
    assert.ok(html.includes(`href="${SITE_ORIGIN}${page.path}"`));
    assert.ok(html.includes(`src="${BRAND_IMAGE}"`));
    assert.ok(html.includes('width="1212" height="285"'));
    assert.ok(html.includes(renderPublicPage(page.path)));
    assert.ok(html.includes(renderMetadata(page.path)));
    assert.ok(!/\son\w+=|<script\s+(?!type="application\/ld\+json")|<iframe|<form|https:\/\/images\./.test(html));
    const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length, 1);
    const data = JSON.parse(scripts[0][2]);
    assert.equal(data["@context"], "https://schema.org");
    assert.equal(data["@graph"][0].url, SITE_ORIGIN + page.path);
    assert.equal(data["@graph"][0]["@type"], page.kind === "article" ? "Article" : page.kind === "index" ? "CollectionPage" : "WebPage");
    assert.equal(data["@graph"][1].itemListElement.at(-1).item, SITE_ORIGIN + page.path);
    for (const section of page.sections || []) assert.ok(html.includes(escapeHtml(section.heading)));
  }
});

test("all internal page links, fragment links and download targets resolve", () => {
  const appLinks = new Set(["/", "/login", "/register", "/#pricing"]);
  for (const page of publicPages) {
    const html = renderPublicPage(page.path);
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (href.startsWith("#")) {
        assert.ok(html.includes(`id="${href.slice(1)}"`), `${page.path}: ${href}`);
      } else if (href.startsWith(DOWNLOAD_BASE)) {
        assert.ok(downloads.some((file) => DOWNLOAD_BASE + file.filename === href));
      } else {
        assert.ok(appLinks.has(href) || PUBLIC_ROUTES.includes(href), `${page.path}: ${href}`);
      }
    }
  }
});

test("download artifacts contain usable CSV, Markdown and self-contained printable HTML", () => {
  assert.equal(downloads.length, 3);
  assert.equal(new Set(downloads.map((file) => file.filename)).size, 3);
  for (const page of templates) {
    const file = downloads.find((item) => item.filename === page.download);
    assert.ok(file);
    assert.ok(file.content.length > 300);
    assert.ok(renderPublicPage(page.path).includes(`download="${file.filename}"`));
  }
  const csv = downloads.find((file) => file.filename.endsWith(".csv")).content;
  assert.equal(csv.charCodeAt(0), 0xfeff);
  const rows = csv.slice(1).trimEnd().split("\r\n");
  assert.equal(rows.length, 3);
  for (const row of rows) {
    const fields = [...row.matchAll(/"((?:[^"]|"")*)"(?:,|$)/g)].map((match) => match[1].replaceAll('""', '"'));
    assert.equal(fields.length, 9);
    assert.ok(fields.every((field) => !/^[=+@-]/.test(field)), "no spreadsheet formulas");
  }
  const markdown = downloads.find((file) => file.filename.endsWith(".md")).content;
  assert.match(markdown, /## 6\. Итоговые договорённости/);
  assert.match(markdown, /Ответственный/);
  assert.match(markdown, /- \[ \]/);
  const printable = downloads.find((file) => file.filename.endsWith(".html")).content;
  assert.match(printable, /@media print/);
  assert.match(printable, /@page \{ size: A4/);
  assert.match(printable, /<table>/);
  assert.match(printable, /noindex, follow/);
  assert.ok(!/<script|src=|<link/.test(printable), "offline printable document has no external dependencies");
});

test("build assets include every page, download, stylesheet, sitemap and robots; never overwrite SPA entry", () => {
  const assets = createPublicAssets(".public-pages { color: black; }");
  assert.equal(assets.size, 20);
  assert.equal(assets.has("index.html"), false);
  for (const path of PUBLIC_ROUTES) assert.ok(assets.has(`${path.slice(1)}index.html`));
  for (const file of downloads) assert.equal(assets.get(DOWNLOAD_BASE.slice(1) + file.filename).source, file.content);
  const sitemap = assets.get("sitemap.xml").source;
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1]);
  assert.deepEqual(locations, [SITE_ORIGIN + "/", ...PUBLIC_ROUTES.map((path) => SITE_ORIGIN + path)]);
  assert.ok(!sitemap.includes("/app") && !sitemap.includes("/downloads/") && !sitemap.includes("/login"));
  const robots = assets.get("robots.txt").source;
  assert.ok(robots.includes(`Sitemap: ${SITE_ORIGIN}/sitemap.xml`));
  assert.ok(robots.includes("Disallow: /app"));
});

test("plugin emits assets and rejects incompatible deployment bases", async () => {
  const plugin = publicPagesPlugin();
  const root = fileURLToPath(new URL("../../", import.meta.url));
  plugin.configResolved({ base: "/", root });
  assert.throws(() => plugin.configResolved({ base: "/other/" }), /base/);
  const emitted = [];
  const watched = [];
  await plugin.generateBundle.call({ emitFile: (asset) => emitted.push(asset), addWatchFile: (file) => watched.push(file) });
  assert.equal(emitted.length, 20);
  assert.equal(watched.length, 1);
  assert.equal(watched[0], fileURLToPath(new URL("../../src/components/PublicPages/PublicPages.css", import.meta.url)));
  assert.ok(emitted.every((asset) => asset.type === "asset"));
  assert.match(emitted.find((asset) => asset.fileName.endsWith(".css")).source, /\.public-pages/);
});

async function request(path, method = "GET", getAssets = () => createPublicAssets("css")) {
  const response = { statusCode: 200, headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; this.ended = true; } };
  let nextCalled = false;
  let error;
  await publicPagesMiddleware(getAssets)({ url: path, method }, response, (reason) => { nextCalled = true; error = reason; });
  return { ...response, nextCalled, error };
}

test("dev middleware serves no-JS pages, redirects aliases, supports HEAD and handles misses", async () => {
  const page = await request("/solutions/owner/?ref=example");
  assert.equal(page.statusCode, 200);
  assert.ok(page.body.includes("<h1>"));
  assert.equal(page.headers["Content-Type"], "text/html; charset=utf-8");
  for (const path of ["/solutions/owner", "/solutions/owner/index.html"]) {
    const redirect = await request(`${path}?ref=example`);
    assert.equal(redirect.statusCode, 301);
    assert.equal(redirect.headers.Location, "/solutions/owner/?ref=example");
  }
  const head = await request("/resources/", "HEAD");
  assert.equal(head.ended, true);
  assert.equal(head.body, undefined);
  const file = await request(DOWNLOAD_BASE + "task-register.csv");
  assert.equal(file.headers["Content-Disposition"], 'attachment; filename="task-register.csv"');
  assert.equal(file.body, downloads[0].content);
  assert.equal((await request("/resources/no-such-file/")).statusCode, 404);
  assert.equal((await request(DOWNLOAD_BASE + "missing.csv")).statusCode, 404);
  assert.equal((await request("/app/dashboard")).nextCalled, true);
  assert.equal((await request("/resources/", "POST")).nextCalled, true);
  const error = new Error("read failed");
  assert.equal((await request("/resources/", "GET", () => { throw error; })).error, error);
});

test("CSS remains scoped with responsive grids and bitmap dimensions", async () => {
  const css = await readFile(new URL("../../src/components/PublicPages/PublicPages.css", import.meta.url), "utf8");
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(css, /aspect-ratio: 1212 \/ 285/);
  assert.ok(!/url\(https?:|font-size:.*vw|letter-spacing:\s*-/.test(css));
  for (const selector of css.matchAll(/([^{}]+)\{/g)) {
    const value = selector[1].trim();
    if (value.startsWith("@media")) continue;
    assert.ok(value.split(",").every((item) => item.trim().startsWith(".public-pages")), value);
  }
});
