import { BRAND_IMAGE, getPublicPage, SITE_ORIGIN } from "./content.js";
import { DOWNLOAD_BASE, downloads } from "./downloads.js";

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

export function getPageMetadata(pathname) {
  const page = getPublicPage(pathname);
  if (!page) return null;
  const canonical = SITE_ORIGIN + page.path;
  const parentPath = page.path.startsWith("/solutions/") ? "/solutions/" : "/resources/";
  const crumbs = [{ "@type": "ListItem", position: 1, name: "Taskspot", item: `${SITE_ORIGIN}/` }];
  if (page.path !== parentPath) {
    crumbs.push({ "@type": "ListItem", position: 2, name: getPublicPage(parentPath).label, item: SITE_ORIGIN + parentPath });
  }
  crumbs.push({ "@type": "ListItem", position: crumbs.length + 1, name: page.label, item: canonical });
  const entity = {
    "@type": page.kind === "article" ? "Article" : page.kind === "index" ? "CollectionPage" : "WebPage",
    "@id": `${canonical}#page`, url: canonical, name: page.label,
    description: page.description, inLanguage: "ru-RU",
    ...(page.kind === "article" ? { headline: page.label, mainEntityOfPage: canonical } : {})
  };
  if (page.kind === "index") {
    entity.mainEntity = {
      "@type": "ItemList",
      itemListElement: page.groups.flatMap((group) => group.paths).map((path, index) => ({
        "@type": "ListItem", position: index + 1, name: getPublicPage(path).label, url: SITE_ORIGIN + path
      }))
    };
  }
  return {
    title: page.title, description: page.description, canonical,
    jsonLd: { "@context": "https://schema.org", "@graph": [entity, { "@type": "BreadcrumbList", itemListElement: crumbs }] }
  };
}

// Escape '<' even in JSON: a literal </script> would terminate the data block.
export function serializeJsonLd(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

export function renderMetadata(pathname) {
  const meta = getPageMetadata(pathname);
  if (!meta) return "";
  return `<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="${escapeHtml(meta.description)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${escapeHtml(meta.canonical)}">
<meta property="og:type" content="${getPublicPage(pathname).kind === "article" ? "article" : "website"}">
<meta property="og:site_name" content="Taskspot">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(meta.description)}">
<meta property="og:url" content="${escapeHtml(meta.canonical)}">
<meta property="og:image" content="${SITE_ORIGIN}${BRAND_IMAGE}">
<meta property="og:image:alt" content="Taskspot">
<script type="application/ld+json">${serializeJsonLd(meta.jsonLd)}</script>`;
}

function pageLink(path, label) {
  return `<a href="${escapeHtml(path)}">${escapeHtml(label)}</a>`;
}

function renderCards(paths) {
  return `<div class="public-pages__grid">${paths.map((path) => {
    const page = getPublicPage(path);
    return `<article class="public-pages__card"><p class="public-pages__kicker">${page.kind === "template" ? "Шаблон" : page.kind === "article" ? "Практика" : "Сценарий"}</p><h3>${pageLink(path, page.label)}</h3><p>${escapeHtml(page.description)}</p></article>`;
  }).join("")}</div>`;
}

export function renderPublicPage(pathname) {
  // The caller supplies only a route, never markup or an arbitrary content object.
  const page = getPublicPage(pathname);
  if (!page) return null;
  const parentPath = page.path.startsWith("/solutions/") ? "/solutions/" : "/resources/";
  const parent = getPublicPage(parentPath);
  const download = downloads.find((file) => file.filename === page.download);
  const downloadLink = download ? `<a class="public-pages__button" href="${DOWNLOAD_BASE}${download.filename}" download="${download.filename}">${escapeHtml(download.label)}</a>` : "";
  return `<div class="public-pages">
<a class="public-pages__skip" href="#public-content">К содержанию</a>
<header class="public-pages__header"><div class="public-pages__header-inner">
<a class="public-pages__brand" href="/" aria-label="Taskspot: главная"><img src="${BRAND_IMAGE}" alt="Taskspot" width="1212" height="285"></a>
<nav class="public-pages__nav" aria-label="Основная навигация"><a href="/solutions/"${parentPath === "/solutions/" ? ' aria-current="' + (page.kind === "index" ? "page" : "true") + '"' : ""}>Решения</a><a href="/resources/"${parentPath === "/resources/" ? ' aria-current="' + (page.kind === "index" ? "page" : "true") + '"' : ""}>Материалы</a><a href="/#pricing">Тарифы</a><a href="/login">Войти</a></nav>
</div></header>
<main id="public-content" class="public-pages__main">
<nav class="public-pages__breadcrumbs" aria-label="Хлебные крошки">${pageLink("/", "Taskspot")}<span aria-hidden="true">/</span>${page.path === parentPath ? `<span aria-current="page">${escapeHtml(page.label)}</span>` : `${pageLink(parentPath, parentPath === "/solutions/" ? "Решения" : "Материалы")}<span aria-hidden="true">/</span><span aria-current="page">${escapeHtml(page.label)}</span>`}</nav>
<header class="public-pages__intro"><p class="public-pages__kicker">${page.kind === "solution" ? "Taskspot / Рабочий сценарий" : page.kind === "article" ? "Практика / Поручения" : page.kind === "template" ? "Библиотека / Шаблон" : "Taskspot / Библиотека решений"}</p><h1>${escapeHtml(page.kind === "solution" ? page.title.replace(" | Taskspot", "") : page.label)}</h1><p class="public-pages__lead">${escapeHtml(page.description)}</p>${downloadLink}</header>
${page.kind === "index" ? page.groups.map((group, index) => `<section class="public-pages__section" aria-labelledby="group-${index}"><h2 id="group-${index}">${escapeHtml(group.heading)}</h2>${renderCards(group.paths)}</section>`).join("") : `
<div class="public-pages__reading-layout"><aside class="public-pages__contents"><nav aria-label="На этой странице"><h2>Содержание</h2><ol>${page.sections.map((section, index) => `<li>${pageLink(`#section-${index + 1}`, section.heading)}</li>`).join("")}</ol></nav></aside>
<article class="public-pages__article">${page.sections.map((section, index) => `<section class="public-pages__section" aria-labelledby="section-${index + 1}"><h2 id="section-${index + 1}">${escapeHtml(section.heading)}</h2>${(section.paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}${section.steps ? `<ol class="public-pages__steps">${section.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}</ol>` : ""}</section>`).join("")}
${page.example ? `<section class="public-pages__example"><h2>${escapeHtml(page.example.title)}</h2><dl>${page.example.rows.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>` : ""}
${download ? `<section class="public-pages__download"><h2>Файл шаблона</h2><p>${escapeHtml(download.filename)}. Без регистрации и отправки email.</p>${downloadLink}</section>` : ""}</article></div>
<section class="public-pages__section public-pages__related"><h2>По теме</h2>${renderCards(page.related)}</section>`}
<section class="public-pages__cta"><div><h2>Перенесите первое поручение в Taskspot</h2><p>Опишите результат, назначьте ответственного и договоритесь о приёмке.</p></div><a class="public-pages__button" href="/register">Создать аккаунт</a></section>
</main><footer class="public-pages__footer"><p>Taskspot. Поручения и проверка результата.</p><nav aria-label="Дополнительная навигация">${pageLink(parent.path, parentPath === "/solutions/" ? "Все решения" : "Все материалы")}${pageLink(parentPath === "/solutions/" ? "/resources/" : "/solutions/", parentPath === "/solutions/" ? "Статьи и шаблоны" : "Решения для команд")}</nav></footer></div>`;
}

export function renderPublicDocument(pathname, cssHref = "/assets/public-pages.css") {
  const body = renderPublicPage(pathname);
  if (!body) return null;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#ffffff"><link rel="icon" type="image/png" href="/brand/taskspot-icon.png">${renderMetadata(pathname)}<link rel="stylesheet" href="${escapeHtml(cssHref)}"><style>body{margin:0}</style></head><body>${body}</body></html>`;
}
