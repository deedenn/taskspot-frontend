import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { renderMetadata, renderPublicPage } from "./renderer.js";
import "./PublicPages.css";

export function PublicPage() {
  const { pathname } = useLocation();
  const html = renderPublicPage(pathname);

  useEffect(() => {
    if (!html) return undefined;
    const selector = 'title, meta[name="description"], meta[name="robots"], link[rel="canonical"], meta[property^="og:"], script[type="application/ld+json"]';
    const previous = [...document.head.querySelectorAll(selector)];
    const template = document.createElement("template");
    // Only the checked-in route catalog reaches the shared, escaping renderer.
    template.innerHTML = renderMetadata(pathname);
    const added = [...template.content.children];
    previous.forEach((node) => node.remove());
    document.head.append(...added);
    return () => {
      added.forEach((node) => node.remove());
      document.head.append(...previous);
    };
  }, [pathname, html]);

  if (!html) {
    return <main className="public-pages public-pages__not-found"><h1>Страница не найдена</h1><a href="/resources/">Статьи и шаблоны</a></main>;
  }

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

export default PublicPage;
