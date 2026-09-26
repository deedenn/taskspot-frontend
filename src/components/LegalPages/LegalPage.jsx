import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import { legalDocuments, legalOperator, TERMS_VERSION } from "./legalContent.js";
import "./LegalPage.css";

export function LegalPage() {
  const { document: slug } = useParams();
  const legalDoc = Object.hasOwn(legalDocuments, slug) ? legalDocuments[slug] : null;

  useEffect(() => {
    if (!legalDoc) return undefined;
    const previousTitle = document.title;
    const description = document.querySelector('meta[name="description"]');
    const previousDescription = description?.content;
    const canonical = document.querySelector('link[rel="canonical"]');
    const previousCanonical = canonical?.href;
    document.title = `${legalDoc.title} | Taskspot`;
    if (description) description.content = legalDoc.lead;
    if (canonical) canonical.href = `https://taskspot.ru/legal/${slug}`;
    return () => {
      document.title = previousTitle;
      if (description) description.content = previousDescription;
      if (canonical) canonical.href = previousCanonical;
    };
  }, [legalDoc, slug]);

  if (!legalDoc) {
    return (
      <main className="legal-page">
        <h1>Документ не найден</h1>
        <Link to="/">На главную</Link>
      </main>
    );
  }

  return (
    <div className="legal-page">
      <header className="legal-page__header">
        <Link to="/" aria-label="Taskspot — главная">
          <BrandLogo />
        </Link>
        <nav aria-label="Правовые документы">
          <Link to="/legal/terms" aria-current={slug === "terms" ? "page" : undefined}>
            Соглашение
          </Link>
          <Link to="/legal/privacy" aria-current={slug === "privacy" ? "page" : undefined}>
            Персональные данные
          </Link>
        </nav>
      </header>
      <main className="legal-page__main">
        <div className="legal-page__intro">
          <span>Taskspot / Правовые документы</span>
          <h1>{legalDoc.title}</h1>
          <p>{legalDoc.lead}</p>
          <small>Редакция от {TERMS_VERSION.split("-").reverse().join(".")}</small>
        </div>
        <div className="legal-page__layout">
          <nav className="legal-page__contents" aria-label="Содержание документа">
            <strong>Содержание</strong>
            {legalDoc.sections.map((section, index) => (
              <a href={`#section-${index + 1}`} key={section.title}>
                {section.title}
              </a>
            ))}
          </nav>
          <article>
            {legalDoc.sections.map((section, index) => (
              <section id={`section-${index + 1}`} key={section.title}>
                <h2>{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
            <section id="operator">
              <h2>Контакты оператора</h2>
              <p>
                {legalOperator.name}. ИНН {legalOperator.inn}, ОГРНИП {legalOperator.ogrnip}.
              </p>
              <p>
                Обращения по использованию Сервиса и персональным данным:{" "}
                <a href={`mailto:${legalOperator.email}`}>{legalOperator.email}</a>.
              </p>
            </section>
          </article>
        </div>
      </main>
      <footer className="legal-page__footer">
        <Link to="/">Taskspot</Link>
        <Link to={slug === "terms" ? "/legal/privacy" : "/legal/terms"}>
          {slug === "terms" ? "Политика обработки персональных данных" : "Пользовательское соглашение"}
        </Link>
      </footer>
    </div>
  );
}
