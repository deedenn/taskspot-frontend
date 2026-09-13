import {
  ArrowRightOutlined,
  BellOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CloudSyncOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  MenuOutlined,
  MobileOutlined,
  ProjectOutlined,
  ReloadOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  SearchOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined
} from "@ant-design/icons";
import { Link } from "react-router-dom";
import { BrandLogo } from "../BrandLogo/BrandLogo.jsx";
import { LANDING_COPY, LANDING_FAQS as faqs, PRICING_PLANS as pricingPlans } from "./landingContent.js";
import { DashboardScene, MobileScene, TaskScene } from "./LandingProductScenes.jsx";
import "./LandingPage.css";

const workflow = [
  {
    title: "Сформулируйте поручение",
    text: "Добавьте срок, ответственного, наблюдателей, чек-лист и нужные файлы.",
    icon: <FileTextOutlined />
  },
  {
    title: "Не упустите отклонение",
    text: "Смотрите задачи в фокусе, получайте уведомления и замечайте просрочки вовремя.",
    icon: <ClockCircleOutlined />
  },
  {
    title: "Примите результат",
    text: "Проверьте работу, завершите задачу или верните её на доработку с комментарием.",
    icon: <CheckCircleFilled />
  }
];

const capabilities = [
  {
    icon: <ProjectOutlined />,
    title: "Проекты и роли",
    text: "Разделяйте работу по проектам. Назначайте владельцев, участников и наблюдателей."
  },
  {
    icon: <SearchOutlined />,
    title: "Поиск и календарь",
    text: "Находите поручения по всей компании и смотрите сроки в календарном представлении."
  },
  {
    icon: <UnorderedListOutlined />,
    title: "Чек-листы и файлы",
    text: "Фиксируйте критерии готовности, прикладывайте документы и собирайте результат в задаче."
  },
  {
    icon: <ReloadOutlined />,
    title: "Шаблоны и повторы",
    text: "Сохраняйте типовые проекты и автоматизируйте регулярные поручения на платных тарифах."
  },
  {
    icon: <BellOutlined />,
    title: "Уведомления",
    text: "Получайте сигналы о назначениях, изменениях, приближении срока и новых комментариях."
  },
  {
    icon: <FileDoneOutlined />,
    title: "Отчёты и CSV",
    text: "Оценивайте выполнение по сотрудникам, динамику задач и выгружайте данные для анализа."
  },
  {
    icon: <HistoryOutlined />,
    title: "Журнал действий",
    text: "Восстанавливайте контекст: кто изменил срок, статус или вернул результат на доработку."
  },
  {
    icon: <MobileOutlined />,
    title: "Работа с телефона",
    text: "Открывайте задачи в мобильном клиенте, обновляйте статус и продолжайте работу при нестабильной сети."
  }
];

const audiences = [
  {
    title: "Владельцу бизнеса",
    text: "Понятная картина по поручениям без ручного сбора статусов в чатах.",
    link: "/solutions/owner/"
  },
  {
    title: "Руководителю отдела",
    text: "Сроки, загрузка ответственных и задачи, которые уже ждут проверки.",
    link: "/solutions/department/"
  },
  {
    title: "Операционной команде",
    text: "Единый повторяемый процесс для точек, объектов, клиентов и внутренних работ.",
    link: "/solutions/production/"
  }
];

function CtaLink({ to, children, variant = "primary", className = "" }) {
  return (
    <Link className={`landing__button landing__button--${variant} ${className}`.trim()} to={to}>
      <span>{children}</span>
      {variant === "primary" && <ArrowRightOutlined aria-hidden="true" />}
    </Link>
  );
}

function SectionHeading({ eyebrow, title, text, centered = false }) {
  return (
    <div className={`landing__section-heading${centered ? " landing__section-heading--centered" : ""}`}>
      <p className="landing__eyebrow">{eyebrow}</p>
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
  const primaryTarget = user ? "/app/dashboard" : "/register";

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
          <a href="#product">Продукт</a>
          <a href="#capabilities">Возможности</a>
          <a href="#pricing">Тарифы</a>
          <a href="/solutions/">Решения</a>
          <a href="/resources/">Материалы</a>
        </nav>
        <div className="landing__actions">
          {user ? (
            <CtaLink to="/app/dashboard">Открыть Taskspot</CtaLink>
          ) : (
            <>
              <CtaLink to="/login" variant="ghost">
                Войти
              </CtaLink>
              <CtaLink to="/register">Начать бесплатно</CtaLink>
            </>
          )}
        </div>
        <details className="landing__mobile-menu">
          <summary aria-label="Открыть меню">
            <MenuOutlined />
          </summary>
          <nav aria-label="Мобильная навигация">
            <a href="#product">Продукт</a>
            <a href="#capabilities">Возможности</a>
            <a href="#pricing">Тарифы</a>
            <a href="/solutions/">Решения</a>
            <a href="/resources/">Материалы</a>
            {!user && <Link to="/login">Войти</Link>}
            <Link className="is-accent" to={primaryTarget}>
              {user ? "Открыть Taskspot" : "Начать бесплатно"}
            </Link>
          </nav>
        </details>
      </header>

      <div id="landing-content">
        <section className="landing__hero">
          <div className="landing__hero-glow" aria-hidden="true" />
          <div className="landing__hero-copy">
            <p className="landing__eyebrow">
              <span>Новый порядок в работе</span> {LANDING_COPY.eyebrow}
            </p>
            <h1>
              Поручения не теряются. <em>Результат виден.</em>
            </h1>
            <p className="landing__lead">{LANDING_COPY.lead}</p>
            <div className="landing__hero-actions">
              <CtaLink to={primaryTarget}>{user ? "Перейти к задачам" : "Начать бесплатно"}</CtaLink>
              <a className="landing__text-link" href="#product">
                Посмотреть интерфейс <span>↓</span>
              </a>
            </div>
            <ul className="landing__trust-list" aria-label="Условия старта">
              <li>
                <CheckOutlined /> 0 ₽ для старта
              </li>
              <li>
                <CheckOutlined /> Без банковской карты
              </li>
              <li>
                <CheckOutlined /> Web и мобильный клиент
              </li>
            </ul>
          </div>
          <div className="landing__hero-scene">
            <DashboardScene hero />
            <div className="landing__floating-note landing__floating-note--left">
              <ClockCircleOutlined />
              <span>
                <strong>Срок под контролем</strong>Напоминание отправлено
              </span>
            </div>
            <div className="landing__floating-note landing__floating-note--right">
              <CheckCircleFilled />
              <span>
                <strong>Результат принят</strong>История сохранена
              </span>
            </div>
          </div>
        </section>

        <section className="landing__promise" aria-label="Главная ценность Taskspot">
          <p>Чат помнит разговор.</p>
          <strong>Taskspot помнит договорённость.</strong>
          <span>Кто отвечает → когда срок → что считать результатом → кто принял работу</span>
        </section>

        <section className="landing__workflow" id="product">
          <SectionHeading
            eyebrow="Простой рабочий цикл"
            title="От поручения до принятого результата"
            text="Без длинного внедрения: сотрудники видят свою работу, руководитель — точки внимания."
            centered
          />
          <div className="landing__workflow-grid">
            {workflow.map((item, index) => (
              <article key={item.title}>
                <span className="landing__workflow-number">0{index + 1}</span>
                <div className="landing__workflow-icon">{item.icon}</div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing__showcase">
          <div className="landing__showcase-row">
            <div className="landing__showcase-copy">
              <p className="landing__eyebrow">Рабочая картина</p>
              <h2>Руководитель сразу видит, где нужна реакция</h2>
              <p>
                На главном экране собраны задачи в работе, приближающиеся сроки, просрочки, проверка результата и
                последние события команды.
              </p>
              <ul>
                <li>
                  <CheckCircleFilled /> Фокус на срочных и просроченных задачах
                </li>
                <li>
                  <CheckCircleFilled /> Быстрый переход к задачам на проверке
                </li>
                <li>
                  <CheckCircleFilled /> Контекст по проектам и участникам
                </li>
              </ul>
            </div>
            <div className="landing__showcase-visual">
              <DashboardScene />
            </div>
          </div>

          <div className="landing__showcase-row landing__showcase-row--reverse">
            <div className="landing__showcase-copy">
              <p className="landing__eyebrow">Вся работа внутри задачи</p>
              <h2>Договорённости не растворяются в переписке</h2>
              <p>
                Описание, критерии готовности, сроки, ответственные, файлы и комментарии остаются рядом с поручением —
                от постановки до приёмки.
              </p>
              <ul>
                <li>
                  <CheckCircleFilled /> Чек-лист делает результат однозначным
                </li>
                <li>
                  <CheckCircleFilled /> Возврат на доработку сохраняет контекст
                </li>
                <li>
                  <CheckCircleFilled /> Журнал фиксирует ключевые изменения
                </li>
              </ul>
            </div>
            <div className="landing__showcase-visual">
              <TaskScene />
            </div>
          </div>

          <div className="landing__mobile-feature">
            <div className="landing__mobile-copy">
              <p className="landing__eyebrow">Работа продолжается вне офиса</p>
              <h2>Задачи всегда под рукой</h2>
              <p>
                Сотрудник может проверить срок, закрыть пункт чек-листа, отметить выполнение и ответить на комментарий с
                телефона.
              </p>
              <div className="landing__mobile-benefits">
                <span>
                  <MobileOutlined /> Мобильный клиент
                </span>
                <span>
                  <CloudSyncOutlined /> Работа при нестабильной сети
                </span>
                <span>
                  <BellOutlined /> Уведомления о важных событиях
                </span>
              </div>
            </div>
            <div className="landing__phone-stage">
              <div className="landing__phone-orbit" aria-hidden="true" />
              <MobileScene />
            </div>
          </div>
        </section>

        <section className="landing__capabilities" id="capabilities">
          <SectionHeading
            eyebrow="Возможности"
            title="Достаточно гибкости для процессов. Достаточно простоты для людей."
            text="Taskspot закрывает ежедневный цикл поручений и не заставляет команду жить в громоздкой системе."
          />
          <div className="landing__capability-grid">
            {capabilities.map((item, index) => (
              <article key={item.title} className={index === 0 || index === 5 ? "is-wide" : ""}>
                <span>{item.icon}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing__audiences">
          <SectionHeading
            eyebrow="Сценарии"
            title="Один процесс контроля — для разных команд"
            text="Настройте проекты под свой контекст, сохранив единые правила постановки и приёмки задач."
          />
          <div className="landing__audience-grid">
            {audiences.map((item, index) => (
              <a href={item.link} key={item.title}>
                <span>0{index + 1}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                <em>
                  Подробнее <ArrowRightOutlined />
                </em>
              </a>
            ))}
          </div>
        </section>

        <section className="landing__pricing" id="pricing">
          <SectionHeading
            eyebrow="Тарифы"
            title="Начните бесплатно. Увеличивайте лимиты по мере роста."
            text="Основной рабочий процесс доступен сразу. Тариф действует на компанию, а не покупается отдельно для каждого сотрудника."
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
                    <ThunderboltOutlined /> Для регулярной работы
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
                <CtaLink to={pricingTarget(plan, user)} variant={plan.highlighted ? "primary" : "outline"}>
                  {user ? (plan.key === "free" ? "Открыть Taskspot" : "Открыть тарифы") : "Начать бесплатно"}
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
            <p className="landing__eyebrow">Практика управления</p>
            <h2>Полезные материалы без сложной теории</h2>
          </div>
          <div className="landing__resource-links">
            <a href="/resources/delegation/">
              <span>
                <TeamOutlined />
              </span>
              <div>
                <small>Руководителю</small>
                <strong>Как делегировать задачи сотрудникам</strong>
              </div>
              <ArrowRightOutlined />
            </a>
            <a href="/resources/task-register/">
              <span>
                <FolderOpenOutlined />
              </span>
              <div>
                <small>Практический шаблон</small>
                <strong>Как вести реестр поручений</strong>
              </div>
              <ArrowRightOutlined />
            </a>
            <a href="/resources/overdue-review/">
              <span>
                <RiseOutlined />
              </span>
              <div>
                <small>Рабочий процесс</small>
                <strong>Как разбирать просроченные поручения</strong>
              </div>
              <ArrowRightOutlined />
            </a>
          </div>
        </section>

        <section className="landing__final-cta">
          <div className="landing__final-grid" aria-hidden="true" />
          <div>
            <p className="landing__eyebrow">Первый проект можно запустить сегодня</p>
            <h2>Верните поручениям ясность, а команде — рабочий ритм.</h2>
          </div>
          <div className="landing__final-action">
            <CtaLink to={primaryTarget}>{user ? "Перейти в Taskspot" : "Начать бесплатно"}</CtaLink>
            {!user && <span>Без банковской карты</span>}
          </div>
        </section>
      </div>

      <footer className="landing__footer">
        <div className="landing__footer-brand">
          <BrandLogo variant="light" />
          <p>Контроль поручений от постановки до принятого результата.</p>
        </div>
        <nav aria-label="Ссылки в подвале">
          <div>
            <strong>Продукт</strong>
            <a href="#capabilities">Возможности</a>
            <a href="#pricing">Тарифы</a>
            <Link to="/login">Войти</Link>
          </div>
          <div>
            <strong>Решения</strong>
            <a href="/solutions/owner/">Владельцу</a>
            <a href="/solutions/department/">Руководителю</a>
            <a href="/solutions/production/">Операционной команде</a>
          </div>
          <div>
            <strong>Материалы</strong>
            <a href="/resources/">Все материалы</a>
            <a href="/resources/delegation/">Делегирование</a>
            <a href="/resources/task-register/">Реестр поручений</a>
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
