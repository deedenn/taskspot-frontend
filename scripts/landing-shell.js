import { LANDING_COPY, LANDING_FAQS, PRICING_PLANS } from "../src/components/LandingPage/landingContent.js";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function renderLandingShell() {
  const plans = PRICING_PLANS.map(
    (plan) => `
      <article>
        <h3>${escapeHtml(plan.name)}</h3>
        <p>${escapeHtml(plan.description)}</p>
        <strong>${escapeHtml(plan.price)}${plan.period ? ` <small>${escapeHtml(plan.period)}</small>` : ""}</strong>
        <ul>${plan.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
        <a href="/register">Начать бесплатно</a>
      </article>`
  ).join("");

  const faq = LANDING_FAQS.map(
    (item) => `<details><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`
  ).join("");

  return `
    <div class="landing-static-shell">
      <header>
        <a class="landing-static-shell__brand" href="/" aria-label="Taskspot — главная"><img src="/brand/taskspot-logo.png" alt="Taskspot" width="168" height="40"></a>
        <nav aria-label="Основная навигация"><a href="#static-product">Продукт</a><a href="#static-pricing">Тарифы</a><a href="/solutions/">Решения</a><a href="/resources/">Материалы</a><a href="/login">Войти</a></nav>
      </header>
      <main>
        <section class="landing-static-shell__hero">
          <p>${escapeHtml(LANDING_COPY.eyebrow)}</p>
          <h1>${escapeHtml(LANDING_COPY.heading)}</h1>
          <div>${escapeHtml(LANDING_COPY.lead)}</div>
          <a href="/register">Начать бесплатно</a>
        </section>
        <section id="static-product" class="landing-static-shell__product">
          <h2>От поручения до принятого результата</h2>
          <p>Проекты, ответственные, сроки, чек-листы, файлы, комментарии, уведомления, отчёты и история действий собраны в одном рабочем пространстве.</p>
          <nav aria-label="Сценарии Taskspot"><a href="/solutions/owner/">Владельцу бизнеса</a><a href="/solutions/department/">Руководителю отдела</a><a href="/solutions/production/">Операционной команде</a></nav>
        </section>
        <section id="static-pricing" class="landing-static-shell__pricing">
          <h2>Тарифы Taskspot</h2>
          <p>Начните бесплатно. Увеличивайте лимиты по мере роста команды.</p>
          <div>${plans}</div>
        </section>
        <section class="landing-static-shell__faq"><h2>Вопросы о Taskspot</h2>${faq}</section>
      </main>
      <footer><a href="/resources/">Статьи и шаблоны</a><a href="/register">Создать бесплатное пространство</a></footer>
    </div>`;
}

export const LANDING_SHELL_CSS = `
  .landing-static-shell{min-height:100vh;color:#071927;background:#f4f3ed;font-family:Arial,sans-serif}
  .landing-static-shell *{box-sizing:border-box}
  .landing-static-shell a{color:inherit}
  .landing-static-shell>header{display:flex;align-items:center;justify-content:space-between;gap:32px;padding:22px max(24px,calc((100% - 1240px)/2));color:#fff;background:#071927}
  .landing-static-shell__brand img{display:block;border-radius:8px;background:#fff}
  .landing-static-shell>header nav,.landing-static-shell footer{display:flex;flex-wrap:wrap;gap:24px}
  .landing-static-shell__hero{padding:100px max(24px,calc((100% - 1240px)/2));color:#fff;background:#071927}
  .landing-static-shell__hero>p{color:#b8f5c8;font-size:13px;font-weight:700;text-transform:uppercase}
  .landing-static-shell h1{max-width:850px;margin:24px 0;font-size:clamp(48px,7vw,86px);line-height:1}
  .landing-static-shell__hero>div{max-width:720px;font-size:20px;line-height:1.6}
  .landing-static-shell__hero>a,.landing-static-shell article>a{display:inline-block;margin-top:28px;padding:15px 22px;border-radius:8px;color:#fff;background:#316cff;text-decoration:none}
  .landing-static-shell__product,.landing-static-shell__pricing,.landing-static-shell__faq{padding:80px max(24px,calc((100% - 1240px)/2))}
  .landing-static-shell h2{max-width:850px;font-size:clamp(36px,5vw,60px);line-height:1.05}
  .landing-static-shell__product nav{display:flex;flex-wrap:wrap;gap:20px;margin-top:28px}
  .landing-static-shell__pricing{background:#fff}
  .landing-static-shell__pricing>div{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:40px}
  .landing-static-shell article{padding:28px;border:1px solid #d8dcdd;border-radius:14px;background:#f4f3ed}
  .landing-static-shell article>strong{display:block;margin:22px 0;font-size:32px}
  .landing-static-shell article small{font-size:12px;font-weight:400}
  .landing-static-shell article li{margin:8px 0}
  .landing-static-shell__faq details{padding:20px 0;border-bottom:1px solid #d8dcdd}
  .landing-static-shell__faq summary{font-weight:700;cursor:pointer}
  .landing-static-shell footer{justify-content:space-between;padding:32px max(24px,calc((100% - 1240px)/2));color:#fff;background:#071927}
  @media(max-width:760px){.landing-static-shell>header nav{display:none}.landing-static-shell__pricing>div{grid-template-columns:1fr}.landing-static-shell__hero{padding-top:72px}.landing-static-shell h1{font-size:48px}}
`;

export function landingShellPlugin() {
  return {
    name: "taskspot-landing-shell",
    transformIndexHtml(html) {
      const shell = renderLandingShell();
      return html
        .replace('<div id="root"></div>', `<div id="root">${shell}</div>`)
        .replace("</head>", `<style data-landing-shell>${LANDING_SHELL_CSS}</style></head>`);
    }
  };
}
