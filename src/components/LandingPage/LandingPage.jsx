import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CrownOutlined,
  EyeOutlined,
  LockOutlined,
  PayCircleOutlined,
  ProjectOutlined,
  RocketOutlined,
  TeamOutlined
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import "./LandingPage.css";

const features = [
  {
    icon: <ProjectOutlined />,
    title: "Контроль поручений",
    text: "Руководитель видит сроки, ответственных, просрочки и задачи, которые ждут проверки."
  },
  {
    icon: <TeamOutlined />,
    title: "Просто для сотрудников",
    text: "Сотрудник открывает задачу, отмечает чек-лист, пишет комментарий и отправляет на проверку."
  },
  {
    icon: <CheckCircleOutlined />,
    title: "История решений",
    text: "Все статусы, комментарии, возвраты на доработку и изменения остаются в логе задачи."
  },
  {
    icon: <LockOutlined />,
    title: "Быстрый старт",
    text: "Email-приглашения, демо-проект, шаблоны задач и понятный onboarding без долгой настройки."
  }
];

const metrics = [
  ["3 роли", "инициатор, ответственный, наблюдатель"],
  ["1 экран", "сроки, статусы и просрочки"],
  ["0 таблиц", "история решений не теряется"]
];

const workflow = [
  {
    icon: <ProjectOutlined />,
    title: "Поставьте поручение",
    text: "Опишите задачу, срок, ответственного, чек-лист и наблюдателей."
  },
  {
    icon: <ClockCircleOutlined />,
    title: "Следите за рисками",
    text: "Taskspot подсвечивает срочные и просроченные задачи до того, как они сорвут работу."
  },
  {
    icon: <CheckCircleOutlined />,
    title: "Принимайте результат",
    text: "Сотрудник отправляет выполнение на проверку, а руководитель подтверждает или возвращает задачу."
  }
];

const pricingPlans = [
  {
    key: "free",
    icon: <RocketOutlined />,
    title: "Бесплатный",
    price: "0 ₽",
    note: "для первого внедрения",
    description: "Подходит, чтобы заменить таблицу поручений и проверить процесс на небольшой команде.",
    features: ["до 3 пользователей", "до 2 проектов", "базовые уведомления", "до 50 активных задач"],
    cta: "Начать бесплатно"
  },
  {
    key: "team",
    icon: <TeamOutlined />,
    title: "Команда",
    price: "990 ₽",
    period: "/мес",
    note: "для регулярного контроля",
    description: "Для руководителей, которым нужны проекты, шаблоны, вложения и больше участников.",
    features: ["до 20 пользователей", "до 50 проектов", "шаблоны задач", "вложения и повторы"],
    cta: "Выбрать команду",
    highlighted: true
  },
  {
    key: "business",
    icon: <CrownOutlined />,
    title: "Бизнес",
    price: "2490 ₽",
    period: "/мес",
    note: "для нескольких отделов",
    description: "Для компаний, которым важны расширенные лимиты, история, отчёты и управленческий контроль.",
    features: ["до 100 пользователей", "до 200 проектов", "расширенная история", "отчёты и приоритетная поддержка"],
    cta: "Перейти на бизнес"
  }
];

const seoScenarios = [
  "Контроль поручений сотрудникам",
  "Учёт задач малого бизнеса",
  "Просроченные задачи и проверка выполнения",
  "Альтернатива таблице поручений"
];

function CtaLink({ to, children, variant = "primary" }) {
  return (
    <Link className={`landing__button landing__button--${variant}`} to={to}>
      <span>{children}</span>
      {variant === "primary" && <ArrowRightOutlined />}
    </Link>
  );
}

function planCtaTarget(plan, user) {
  if (!user) {
    return "/register";
  }

  return plan.key === "free" ? "/app/dashboard" : "/app/billing";
}

export function LandingPage({ user }) {
  return (
    <main className="landing">
      <header className="landing__nav">
        <Link className="landing__brand" to="/">
          <BrandLogo variant="light" />
        </Link>
        <nav className="landing__nav-links" aria-label="Разделы лендинга">
          <a href="#features">Возможности</a>
          <a href="#workflow">Как работает</a>
          <a href="#pricing">Тарифы</a>
          <a href="#use-cases">Для кого</a>
        </nav>
        <div className="landing__actions">
          {user ? (
            <CtaLink to="/app/dashboard">В приложение</CtaLink>
          ) : (
            <>
              <CtaLink to="/login" variant="ghost">Войти</CtaLink>
              <CtaLink to="/register">Регистрация</CtaLink>
            </>
          )}
        </div>
      </header>

      <section className="landing__hero">
        <div className="landing__hero-copy">
          <p className="landing__eyebrow">Taskspot для малого бизнеса</p>
          <h1>Поручения сотрудникам под контролем без сложной CRM</h1>
          <p className="landing__lead">
            Ставьте задачи, назначайте ответственных, ловите просрочки заранее
            и принимайте выполненную работу в одном спокойном рабочем пространстве.
          </p>
          <div className="landing__hero-actions">
            <CtaLink to={user ? "/app/dashboard" : "/register"}>Начать работу</CtaLink>
            <CtaLink to="/login" variant="secondary">У меня есть аккаунт</CtaLink>
          </div>
          <dl className="landing__metrics" aria-label="Ключевые преимущества">
            {metrics.map(([value, label]) => (
              <div key={value}>
                <dt>{value}</dt>
                <dd>{label}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="landing__product-shot" aria-label="Пример рабочего экрана Taskspot">
          <div className="landing__product-topbar">
            <span>Контроль</span>
            <strong>Сегодня</strong>
          </div>
          <div className="landing__product-grid">
            <div className="landing__panel landing__panel--accent">
              <div>
                <span className="landing__panel-kicker">Просрочено</span>
                <strong>4</strong>
              </div>
              <p>2 задачи ждут реакции руководителя</p>
            </div>
            <div className="landing__panel">
              <div>
                <span className="landing__panel-kicker">На проверке</span>
                <strong>7</strong>
              </div>
              <p>готовые задачи не зависают в чатах</p>
            </div>
          </div>
          <div className="landing__task-list">
            <div className="landing__task landing__task--urgent">
              <span><CalendarOutlined /> Сегодня</span>
              <b>Проверить остатки на складе</b>
              <em>Иван Петров</em>
            </div>
            <div className="landing__task">
              <span><EyeOutlined /> Проверка</span>
              <b>Еженедельный отчёт отдела продаж</b>
              <em>Анна Смирнова</em>
            </div>
            <div className="landing__task">
              <span><LockOutlined /> История</span>
              <b>Согласовать акт сверки</b>
              <em>3 комментария, 1 возврат</em>
            </div>
          </div>
        </div>
      </section>

      <section className="landing__features" id="features">
        {features.map((feature) => (
          <article className="landing__feature" key={feature.title}>
            <div className="landing__feature-icon">{feature.icon}</div>
            <h2>{feature.title}</h2>
            <p>{feature.text}</p>
          </article>
        ))}
      </section>

      <section className="landing__workflow" id="workflow">
        <div className="landing__section-head">
          <p className="landing__eyebrow">Как работает</p>
          <h2>От поручения до принятого результата</h2>
        </div>
        <div className="landing__workflow-grid">
          {workflow.map((item, index) => (
            <article className="landing__workflow-card" key={item.title}>
              <span className="landing__workflow-index">0{index + 1}</span>
              <div className="landing__feature-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__pricing" id="pricing">
        <div className="landing__section-head landing__pricing-head">
          <div>
            <p className="landing__eyebrow">Тарифы</p>
            <h2>Начните бесплатно, подключайте командные возможности по мере роста</h2>
          </div>
          <p>
            На первом этапе оплату можно проводить вручную через счёт или платёжную ссылку.
            Сложная интеграция эквайринга не нужна для старта продаж.
          </p>
        </div>
        <div className="landing__pricing-grid">
          {pricingPlans.map((plan) => (
            <article
              className={plan.highlighted ? "landing__price-card landing__price-card--highlighted" : "landing__price-card"}
              key={plan.key}
            >
              {plan.highlighted && <span className="landing__price-badge">Популярный старт</span>}
              <div className="landing__price-top">
                <span className="landing__price-icon">{plan.icon}</span>
                <div>
                  <h3>{plan.title}</h3>
                  <p>{plan.note}</p>
                </div>
              </div>
              <div className="landing__price-value">
                <strong>{plan.price}</strong>
                {plan.period && <span>{plan.period}</span>}
              </div>
              <p className="landing__price-description">{plan.description}</p>
              <ul className="landing__price-features">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <CheckCircleOutlined />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <CtaLink to={planCtaTarget(plan, user)} variant={plan.highlighted ? "primary" : "secondary"}>
                {plan.cta}
              </CtaLink>
            </article>
          ))}
        </div>
        <div className="landing__pricing-footnote">
          <PayCircleOutlined />
          <span>Полученные платежи и тарифы можно контролировать в админ-панели сервиса.</span>
        </div>
      </section>

      <section className="landing__seo" id="use-cases">
        <div>
          <h2>Для владельцев, которым нужен порядок в поручениях</h2>
          <p>
            Если задачи живут в чатах, таблицах и устных договорённостях, руководителю сложно понять,
            кто что обещал и почему срок сорвался. Taskspot собирает поручения, ответственных,
            сроки, чек-листы и подтверждение выполнения в одном месте.
          </p>
        </div>
        <div className="landing__seo-tags">
          {seoScenarios.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </section>

      <section className="landing__final">
        <div>
          <p className="landing__eyebrow">Готово к первому проекту</p>
          <h2>Запустите контроль поручений уже сегодня</h2>
        </div>
        <CtaLink to={user ? "/app/dashboard" : "/register"}>Попробовать Taskspot</CtaLink>
      </section>
    </main>
  );
}
