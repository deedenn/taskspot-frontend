import {
  ArrowRightOutlined,
  BellOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  MenuOutlined,
  PaperClipOutlined,
  ProjectOutlined,
  ReloadOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
  UserAddOutlined
} from "@ant-design/icons";
import { useState } from "react";
import { Link } from "react-router-dom";
import { reachYandexGoal, YANDEX_METRIKA_GOALS } from "../../analytics/yandexMetrika.js";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import { LANDING_COPY, LANDING_FAQS as faqs, PRICING_PLANS as pricingPlans } from "./landingContent.js";
import "./LandingPage.css";

const problems = [
  {
    icon: <CommentOutlined />,
    title: "Поручения остаются в чатах",
    text: "Задачи смешиваются с перепиской, а важные детали приходится искать вручную."
  },
  {
    icon: <ClockCircleOutlined />,
    title: "Сроки вспоминают слишком поздно",
    text: "Без единого списка руководитель узнаёт о задержке, когда она уже стала проблемой."
  },
  {
    icon: <FileDoneOutlined />,
    title: "Результат приходится уточнять",
    text: "Непонятно, что уже сделано, кто должен проверить работу и почему задачу вернули."
  }
];

const workflow = [
  {
    title: "Поставьте задачу",
    text: "Например: «Подготовить договор аренды». Укажите срок, ответственного и понятный чек-лист.",
    status: "Открыта",
    icon: <FileTextOutlined />
  },
  {
    title: "Следите за выполнением",
    text: "Ответственный видит свою работу, отмечает пункты чек-листа и отправляет результат на проверку.",
    status: "В работе",
    icon: <UnorderedListOutlined />
  },
  {
    title: "Примите результат",
    text: "Проверьте файлы и комментарии. Закройте задачу или верните на доработку с пояснением.",
    status: "На проверке",
    icon: <CheckCircleFilled />
  }
];

const demoTabs = [
  {
    key: "manager",
    label: "Руководитель",
    title: "Вся работа команды — на одном экране",
    text: "Проекты, ответственные, сроки и статусы собраны в рабочем списке. Просрочки и задачи на проверке видны сразу.",
    image: "/screenshots/manager-dashboard.png",
    alt: "Главный экран Taskspot с рабочим списком задач руководителя"
  },
  {
    key: "employee",
    label: "Сотрудник",
    title: "Понятно, что делать сейчас",
    text: "Сотрудник открывает список с телефона, видит сроки и переводит задачу по рабочему процессу без лишних уточнений.",
    image: "/screenshots/employee-dashboard.png",
    alt: "Мобильный рабочий список задач сотрудника в Taskspot"
  },
  {
    key: "task",
    label: "Карточка задачи",
    title: "Контекст и результат остаются вместе",
    text: "Постановка, роли, чек-лист, файлы, комментарии и история изменений хранятся в одной карточке.",
    image: "/screenshots/task-card.png",
    alt: "Карточка задачи Taskspot с ответственным, сроком, чек-листом и файлами"
  }
];

const roleBenefits = [
  {
    eyebrow: "Для руководителя",
    title: "Контроль без постоянных вопросов",
    text: "Сразу видно, что просрочено, что ждёт проверки и как распределены задачи по команде.",
    points: ["Единая картина по проектам", "Приёмка результата", "История изменений и комментариев"],
    icon: <RiseOutlined />
  },
  {
    eyebrow: "Для сотрудника",
    title: "Ясный список и понятный результат",
    text: "В задаче уже есть срок, чек-лист, файлы и критерии готовности — меньше уточнений и переключений.",
    points: ["Свои задачи и сроки", "Чек-листы и вложения", "Быстрый статус «На проверке»"],
    icon: <TeamOutlined />
  }
];

const capabilities = [
  {
    icon: <ProjectOutlined />,
    title: "Проекты и роли",
    text: "Разделяйте работу по проектам и назначайте администраторов, ответственных и наблюдателей."
  },
  {
    icon: <ClockCircleOutlined />,
    title: "Сроки и напоминания",
    text: "Указывайте дату и точное время. Если время не задано, срок действует до конца дня."
  },
  {
    icon: <UnorderedListOutlined />,
    title: "Чек-листы",
    text: "Фиксируйте критерии готовности и отмечайте выполненные шаги прямо в задаче."
  },
  {
    icon: <PaperClipOutlined />,
    title: "Файлы и комментарии",
    text: "Храните материалы и обсуждение рядом с задачей, а не в разных чатах и папках."
  },
  {
    icon: <SafetyCertificateOutlined />,
    title: "Проверка результата",
    text: "Принимайте выполненную работу или возвращайте её на доработку с обязательным комментарием."
  },
  {
    icon: <ReloadOutlined />,
    title: "Шаблоны и повторы",
    text: "Сохраняйте типовые проекты и запускайте регулярные задачи на платных тарифах."
  }
];

const audiences = [
  {
    title: "Владельцу небольшого бизнеса",
    text: "Поручения сотрудникам и подрядчикам остаются под контролем без сложной системы внедрения.",
    link: "/solutions/owner/"
  },
  {
    title: "Руководителю отдела",
    text: "Сроки, нагрузка ответственных и результаты на проверке собраны в одном рабочем пространстве.",
    link: "/solutions/department/"
  },
  {
    title: "Операционной команде",
    text: "Повторяемый процесс для точек, объектов, клиентов и ежедневных внутренних работ.",
    link: "/solutions/production/"
  }
];

const startSteps = [
  [<UserAddOutlined key="register" />, "Зарегистрируйтесь", "Подтвердите email — банковская карта не нужна."],
  [
    <FolderOpenOutlined key="project" />,
    "Создайте проект",
    "Первый проект появится автоматически. Переименуйте его под свою работу."
  ],
  [
    <TeamOutlined key="team" />,
    "Добавьте команду",
    "Пригласите участников и поставьте первую задачу с ответственным и сроком."
  ]
];

function trackLandingAction(placement, target) {
  reachYandexGoal(YANDEX_METRIKA_GOALS.landingCta, { placement, target });
}

function CtaLink({ to, children, variant = "primary", className = "", placement = "unknown" }) {
  return (
    <Link
      className={`landing__button landing__button--${variant} ${className}`.trim()}
      to={to}
      onClick={() => trackLandingAction(placement, to)}
    >
      <span>{children}</span>
      {variant === "primary" && <ArrowRightOutlined aria-hidden="true" />}
    </Link>
  );
}

function SectionHeading({ eyebrow, title, text, centered = false }) {
  return (
    <div className={`landing__section-heading${centered ? " landing__section-heading--centered" : ""}`}>
      {eyebrow && <p className="landing__eyebrow">{eyebrow}</p>}
      <h2>{title}</h2>
      {text && <p className="landing__section-lead">{text}</p>}
    </div>
  );
}

function pricingTarget(plan, user) {
  if (!user) return "/register";
  return plan.key === "free" ? "/app/dashboard" : "/app/billing";
}

export function LandingPage({ user }) {
  const [demoTab, setDemoTab] = useState("manager");
  const primaryTarget = user ? "/app/dashboard" : "/register";
  const activeDemo = demoTabs.find((tab) => tab.key === demoTab) || demoTabs[0];

  function handleDemoTabKeyDown(event, tabIndex) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? demoTabs.length - 1
          : (tabIndex + (event.key === "ArrowRight" ? 1 : -1) + demoTabs.length) % demoTabs.length;
    const nextTab = demoTabs[nextIndex];
    setDemoTab(nextTab.key);
    document.getElementById(`landing-tab-${nextTab.key}`)?.focus();
  }

  return (
    <main className="landing">
      <a className="landing__skip-link" href="#landing-content">
        К содержанию
      </a>
      <header className="landing__nav" aria-label="Основная навигация">
        <Link className="landing__brand" to="/" aria-label="Taskspot — главная">
          <BrandLogo variant="light" />
        </Link>
        <nav className="landing__nav-links" aria-label="Разделы страницы">
          <a href="#how-it-works">Как работает</a>
          <a href="#capabilities">Возможности</a>
          <a href="#audiences">Для кого</a>
          <a href="#pricing">Тарифы</a>
        </nav>
        <div className="landing__actions">
          {user ? (
            <CtaLink to="/app/dashboard" placement="header-authenticated">
              Открыть Taskspot
            </CtaLink>
          ) : (
            <>
              <CtaLink to="/login" variant="ghost" placement="header-login">
                Войти
              </CtaLink>
              <CtaLink to="/register" placement="header-register">
                Начать бесплатно
              </CtaLink>
            </>
          )}
        </div>
        <details className="landing__mobile-menu">
          <summary aria-label="Открыть меню">
            <MenuOutlined />
          </summary>
          <nav aria-label="Мобильная навигация">
            <a href="#how-it-works">Как работает</a>
            <a href="#capabilities">Возможности</a>
            <a href="#audiences">Для кого</a>
            <a href="#pricing">Тарифы</a>
            {!user && <Link to="/login">Войти</Link>}
            <Link
              className="is-accent"
              to={primaryTarget}
              onClick={() => trackLandingAction("mobile-menu", primaryTarget)}
            >
              {user ? "Открыть Taskspot" : "Начать бесплатно"}
            </Link>
          </nav>
        </details>
      </header>

      <div id="landing-content">
        <section className="landing__hero">
          <div className="landing__hero-copy">
            <p className="landing__eyebrow">{LANDING_COPY.eyebrow}</p>
            <h1>{LANDING_COPY.heading}</h1>
            <p className="landing__lead">{LANDING_COPY.lead}</p>
            <div className="landing__hero-actions">
              <CtaLink to={primaryTarget} placement="hero-primary">
                {user ? "Перейти к задачам" : "Начать бесплатно"}
              </CtaLink>
              <a
                className="landing__button landing__button--secondary"
                href="#how-it-works"
                onClick={() => trackLandingAction("hero-secondary", "#how-it-works")}
              >
                Посмотреть, как работает
              </a>
            </div>
            <ul className="landing__trust-list" aria-label="Условия старта">
              <li>
                <CheckOutlined /> Бесплатный тариф
              </li>
              <li>
                <CheckOutlined /> Без банковской карты
              </li>
              <li>
                <CheckOutlined /> Для команды
              </li>
            </ul>
          </div>
          <figure className="landing__hero-screen">
            <div className="landing__screen-top" aria-hidden="true">
              <i />
              <i />
              <i />
              <span>taskspot.ru</span>
            </div>
            <img src="/screenshots/manager-dashboard.png" alt="Главная Taskspot с реальным рабочим списком задач" />
            <figcaption>
              <span>
                <ClockCircleOutlined /> Сроки и просрочки видны сразу
              </span>
              <span>
                <CheckCircleFilled /> Результат проходит проверку
              </span>
            </figcaption>
          </figure>
        </section>

        <section className="landing__problems">
          <SectionHeading
            eyebrow="Знакомая ситуация"
            title="Когда задачи живут в чатах, контроль держится в голове"
            text="Taskspot собирает поручение, срок, ответственного и результат в одном понятном процессе."
            centered
          />
          <div className="landing__problem-grid">
            {problems.map((item) => (
              <article key={item.title}>
                <span>{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing__workflow" id="how-it-works">
          <SectionHeading
            eyebrow="Как работает Taskspot"
            title="От постановки до принятого результата — три понятных шага"
            text="Один рабочий цикл для руководителя и сотрудника, без таблиц и бесконечных уточнений в мессенджере."
          />
          <div className="landing__workflow-grid">
            {workflow.map((item, index) => (
              <article key={item.title}>
                <div className="landing__workflow-top">
                  <span className="landing__workflow-number">0{index + 1}</span>
                  <span className="landing__workflow-icon">{item.icon}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <span className={`landing__status landing__status--${index}`}>{item.status}</span>
              </article>
            ))}
          </div>
          <div className="landing__inline-action">
            <CtaLink to={primaryTarget} variant="outline" placement="workflow">
              {user ? "Открыть рабочий список" : "Попробовать на своей задаче"}
            </CtaLink>
          </div>
        </section>

        <section className="landing__demo" id="interface">
          <SectionHeading
            eyebrow="Настоящий интерфейс"
            title="С первого экрана понятно, что происходит"
            text="Ниже — реальные экраны действующего сервиса с безопасными демонстрационными данными."
            centered
          />
          <div className="landing__demo-shell">
            <div className="landing__demo-tabs" role="tablist" aria-label="Экраны Taskspot">
              {demoTabs.map((tab, tabIndex) => (
                <button
                  key={tab.key}
                  type="button"
                  id={`landing-tab-${tab.key}`}
                  role="tab"
                  aria-selected={demoTab === tab.key}
                  aria-controls={`landing-panel-${tab.key}`}
                  tabIndex={demoTab === tab.key ? 0 : -1}
                  onKeyDown={(event) => handleDemoTabKeyDown(event, tabIndex)}
                  onClick={() => {
                    setDemoTab(tab.key);
                    trackLandingAction("interface-tab", tab.key);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div
              className="landing__demo-panel"
              id={`landing-panel-${activeDemo.key}`}
              role="tabpanel"
              aria-labelledby={`landing-tab-${activeDemo.key}`}
            >
              <div className="landing__demo-copy">
                <p className="landing__eyebrow">{activeDemo.label}</p>
                <h3>{activeDemo.title}</h3>
                <p>{activeDemo.text}</p>
                <CtaLink to={primaryTarget} variant="outline" placement={`demo-${activeDemo.key}`}>
                  {user ? "Открыть Taskspot" : "Начать бесплатно"}
                </CtaLink>
              </div>
              <figure className={`landing__demo-image landing__demo-image--${activeDemo.key}`}>
                <img src={activeDemo.image} alt={activeDemo.alt} />
              </figure>
            </div>
          </div>
        </section>

        <section className="landing__roles">
          {roleBenefits.map((role) => (
            <article key={role.eyebrow}>
              <span className="landing__role-icon">{role.icon}</span>
              <p className="landing__eyebrow">{role.eyebrow}</p>
              <h2>{role.title}</h2>
              <p>{role.text}</p>
              <ul>
                {role.points.map((point) => (
                  <li key={point}>
                    <CheckCircleFilled /> {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </section>

        <section className="landing__capabilities" id="capabilities">
          <SectionHeading
            eyebrow="Возможности"
            title="Всё для работы с задачами. Ничего лишнего."
            text="Инструменты для ежедневной работы небольшой команды — от постановки до проверки результата."
          />
          <div className="landing__capability-grid">
            {capabilities.map((item) => (
              <article key={item.title}>
                <span>{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
          <div className="landing__inline-action">
            <CtaLink to={primaryTarget} variant="outline" placement="features">
              {user ? "Перейти к задачам" : "Создать первую задачу"}
            </CtaLink>
          </div>
        </section>

        <section className="landing__audiences" id="audiences">
          <SectionHeading
            eyebrow="Для кого"
            title="Простой контроль для команд, где важен результат"
            text="Taskspot подходит небольшим командам, которые выросли из переписки, таблиц и устных договорённостей."
          />
          <div className="landing__audience-grid">
            {audiences.map((item, index) => (
              <Link to={item.link} key={item.title}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <em>
                  Посмотреть сценарий <ArrowRightOutlined />
                </em>
              </Link>
            ))}
          </div>
        </section>

        <section className="landing__start">
          <SectionHeading
            eyebrow="Простой старт"
            title="От регистрации до первой задачи — несколько минут"
            text="Начните с бесплатного тарифа и подключайте дополнительные возможности по мере роста команды."
            centered
          />
          <div className="landing__start-grid">
            {startSteps.map(([icon, title, text], index) => (
              <article key={title}>
                <span className="landing__start-number">{index + 1}</span>
                <span className="landing__start-icon">{icon}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing__pricing" id="pricing">
          <SectionHeading
            eyebrow="Тарифы"
            title="Начните бесплатно. Увеличивайте лимиты по мере роста."
            text="Тариф действует на всю компанию — отдельная лицензия для каждого сотрудника не нужна."
            centered
          />
          <div className="landing__pricing-grid">
            {pricingPlans.map((plan) => (
              <article
                className={`landing__price-card${plan.highlighted ? " landing__price-card--highlighted" : ""}`}
                key={plan.key}
              >
                {plan.highlighted && (
                  <span className="landing__price-label">
                    <ThunderboltOutlined /> Выбор небольшой команды
                  </span>
                )}
                <div className="landing__price-head">
                  <h3>{plan.name}</h3>
                  <p>{plan.description}</p>
                </div>
                <div className="landing__price">
                  <strong>{plan.price}</strong>
                  {plan.period && <span>{plan.period}</span>}
                </div>
                <CtaLink
                  to={pricingTarget(plan, user)}
                  variant={plan.highlighted ? "primary" : "outline"}
                  placement={`pricing-${plan.key}`}
                >
                  {user
                    ? plan.key === "free"
                      ? "Открыть Taskspot"
                      : "Выбрать тариф"
                    : plan.key === "free"
                      ? "Начать бесплатно"
                      : "Выбрать тариф"}
                </CtaLink>
                <div className="landing__price-divider" />
                <ul>
                  {plan.features.map((feature) => (
                    <li key={feature}>
                      <CheckOutlined />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
          <p className="landing__pricing-note">
            <SafetyCertificateOutlined /> После окончания платного периода данные сохраняются. Новые действия доступны в
            пределах бесплатного тарифа.
          </p>
        </section>

        <section className="landing__faq">
          <SectionHeading eyebrow="Вопросы" title="Что важно знать до старта" />
          <div className="landing__faq-list">
            {faqs.map((item) => (
              <details key={item.question}>
                <summary>
                  <span>{item.question}</span>
                  <i aria-hidden="true" />
                </summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="landing__resources">
          <div>
            <p className="landing__eyebrow">Полезные материалы</p>
            <h2>Практика управления без сложной теории</h2>
          </div>
          <div className="landing__resource-links">
            <Link to="/resources/delegation/">
              <span>
                <TeamOutlined />
              </span>
              <div>
                <small>Руководителю</small>
                <strong>Как делегировать задачи сотрудникам</strong>
              </div>
              <ArrowRightOutlined />
            </Link>
            <Link to="/resources/task-register/">
              <span>
                <FolderOpenOutlined />
              </span>
              <div>
                <small>Практический шаблон</small>
                <strong>Как вести реестр поручений</strong>
              </div>
              <ArrowRightOutlined />
            </Link>
            <Link to="/resources/overdue-review/">
              <span>
                <HistoryOutlined />
              </span>
              <div>
                <small>Рабочий процесс</small>
                <strong>Как разбирать просроченные поручения</strong>
              </div>
              <ArrowRightOutlined />
            </Link>
          </div>
        </section>

        <section className="landing__final-cta">
          <div>
            <p className="landing__eyebrow">Начните с одной задачи</p>
            <h2>Наведите порядок в поручениях уже сегодня</h2>
            <p>Первый проект и бесплатный тариф будут готовы сразу после подтверждения email.</p>
          </div>
          <div className="landing__final-action">
            <CtaLink to={primaryTarget} placement="final">
              {user ? "Перейти в Taskspot" : "Начать бесплатно"}
            </CtaLink>
            {!user && <span>Без банковской карты</span>}
          </div>
        </section>
      </div>

      <footer className="landing__footer">
        <div className="landing__footer-brand">
          <BrandLogo variant="light" />
          <p>Простой сервис задач и контроля поручений для небольших команд.</p>
        </div>
        <nav aria-label="Ссылки в подвале">
          <div>
            <strong>Продукт</strong>
            <a href="#how-it-works">Как работает</a>
            <a href="#capabilities">Возможности</a>
            <a href="#pricing">Тарифы</a>
          </div>
          <div>
            <strong>Решения</strong>
            <Link to="/solutions/owner/">Владельцу</Link>
            <Link to="/solutions/department/">Руководителю</Link>
            <Link to="/solutions/production/">Операционной команде</Link>
          </div>
          <div>
            <strong>Материалы</strong>
            <Link to="/resources/">Все материалы</Link>
            <Link to="/resources/delegation/">Делегирование</Link>
            <Link to="/resources/task-register/">Реестр поручений</Link>
          </div>
          <div>
            <strong>Правовая информация</strong>
            <Link to="/legal/terms">Пользовательское соглашение</Link>
            <Link to="/legal/privacy">Персональные данные</Link>
            <a href="mailto:help@taskspot.ru">Связаться с нами</a>
          </div>
        </nav>
        <div className="landing__footer-bottom">
          <span>© {new Date().getFullYear()} Taskspot</span>
          <span>Сделано для команд, которым важен результат.</span>
        </div>
      </footer>
    </main>
  );
}
