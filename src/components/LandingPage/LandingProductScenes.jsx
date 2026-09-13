import {
  AppstoreOutlined,
  BellOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  CheckOutlined,
  ClockCircleOutlined,
  CommentOutlined,
  FileDoneOutlined,
  FolderOpenOutlined,
  HistoryOutlined,
  MenuOutlined,
  MoreOutlined,
  PaperClipOutlined,
  PlusOutlined,
  SearchOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined
} from "@ant-design/icons";

const dashboardTasks = [
  { title: "Согласовать макет витрины", meta: "Сегодня, 17:00", owner: "АС", tone: "today" },
  { title: "Подготовить отчёт по продажам", meta: "На проверке", owner: "МП", tone: "review" },
  { title: "Обновить остатки на складе", meta: "Просрочено на 1 день", owner: "ИК", tone: "late" }
];

function BrowserFrame({ children, className = "", label }) {
  return (
    <figure className={`product-scene ${className}`} role="img" aria-label={label}>
      <div className="product-scene__chrome">
        <div className="product-scene__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className="product-scene__address">app.taskspot.ru</div>
        <span className="product-scene__secure">
          <CheckOutlined /> Защищено
        </span>
      </div>
      {children}
    </figure>
  );
}

function ProductSidebar({ active = "Контроль" }) {
  const items = [
    [<AppstoreOutlined key="dashboard" />, "Контроль"],
    [<UnorderedListOutlined key="tasks" />, "Все задачи"],
    [<CalendarOutlined key="calendar" />, "Календарь"],
    [<FileDoneOutlined key="reports" />, "Эффективность"]
  ];

  return (
    <aside className="product-scene__sidebar" aria-hidden="true">
      <div className="product-scene__mini-brand">
        <span>t</span>
        <strong>taskspot</strong>
      </div>
      <nav>
        {items.map(([icon, label]) => (
          <span className={label === active ? "is-active" : ""} key={label}>
            {icon}
            {label}
          </span>
        ))}
      </nav>
      <div className="product-scene__project-link">
        <FolderOpenOutlined /> Розничная сеть
      </div>
      <div className="product-scene__person">
        <span>АС</span>
        <div>
          <strong>Анна</strong>
          <small>Руководитель</small>
        </div>
      </div>
    </aside>
  );
}

export function DashboardScene({ hero = false }) {
  return (
    <BrowserFrame
      className={hero ? "product-scene--hero" : ""}
      label="Демонстрационный экран контроля поручений Taskspot"
    >
      <div className="product-scene__app">
        <ProductSidebar />
        <div className="dashboard-preview">
          <header className="preview-header">
            <div>
              <small>Рабочее пространство</small>
              <h3>Добрый день, Анна</h3>
            </div>
            <div className="preview-header__actions">
              <SearchOutlined />
              <BellOutlined />
              <span>АС</span>
            </div>
          </header>
          <div className="dashboard-preview__summary">
            <article>
              <span className="summary-icon summary-icon--blue">
                <UnorderedListOutlined />
              </span>
              <div>
                <small>В работе</small>
                <strong>18</strong>
              </div>
              <em>Все задачи</em>
            </article>
            <article>
              <span className="summary-icon summary-icon--amber">
                <ClockCircleOutlined />
              </span>
              <div>
                <small>Требуют внимания</small>
                <strong>4</strong>
              </div>
              <em>Сегодня</em>
            </article>
            <article>
              <span className="summary-icon summary-icon--green">
                <CheckCircleFilled />
              </span>
              <div>
                <small>На проверке</small>
                <strong>3</strong>
              </div>
              <em>Принять</em>
            </article>
          </div>
          <div className="dashboard-preview__body">
            <section className="dashboard-preview__tasks">
              <div className="preview-title">
                <div>
                  <small>Мои задачи</small>
                  <h4>В фокусе сегодня</h4>
                </div>
                <span className="preview-title__link">
                  Все задачи <span>→</span>
                </span>
              </div>
              <div className="preview-task-list">
                {dashboardTasks.map((task) => (
                  <div className="preview-task" key={task.title}>
                    <i className={`preview-task__status preview-task__status--${task.tone}`} />
                    <div>
                      <strong>{task.title}</strong>
                      <small className={`is-${task.tone}`}>
                        <CalendarOutlined /> {task.meta}
                      </small>
                    </div>
                    <span>{task.owner}</span>
                    <MoreOutlined />
                  </div>
                ))}
              </div>
            </section>
            <aside className="dashboard-preview__activity">
              <div className="preview-title">
                <div>
                  <small>Команда</small>
                  <h4>Последние события</h4>
                </div>
              </div>
              <div className="activity-item">
                <span className="activity-item__avatar">МП</span>
                <p>
                  <strong>Мария</strong> отправила отчёт на проверку<small>8 минут назад</small>
                </p>
              </div>
              <div className="activity-item">
                <span className="activity-item__icon">
                  <CommentOutlined />
                </span>
                <p>
                  <strong>Игорь</strong> добавил комментарий<small>26 минут назад</small>
                </p>
              </div>
              <div className="activity-item">
                <span className="activity-item__icon activity-item__icon--done">
                  <CheckOutlined />
                </span>
                <p>
                  Задача <strong>принята</strong>
                  <small>1 час назад</small>
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
      {hero && (
        <figcaption>
          <span>Демонстрация интерфейса</span> Сроки, проверка и активность команды — на одном экране
        </figcaption>
      )}
    </BrowserFrame>
  );
}

export function TaskScene() {
  return (
    <BrowserFrame label="Демонстрационный экран задачи Taskspot">
      <div className="product-scene__app product-scene__app--task">
        <ProductSidebar active="Все задачи" />
        <div className="task-preview">
          <header className="preview-header">
            <div>
              <small>Розничная сеть / Запуск точки</small>
              <h3>Подготовить открытие магазина</h3>
            </div>
            <div className="preview-header__actions">
              <BellOutlined />
              <span>АС</span>
            </div>
          </header>
          <div className="task-preview__toolbar">
            <span className="task-preview__action">
              <CheckCircleFilled /> Отправить на проверку
            </span>
            <span>В работе</span>
            <MoreOutlined />
          </div>
          <div className="task-preview__layout">
            <section className="task-preview__main">
              <p className="task-preview__description">
                Проверить готовность точки к открытию и приложить итоговые фотографии торгового зала.
              </p>
              <div className="task-preview__section-title">
                <strong>Чек-лист</strong>
                <span>3 из 5</span>
              </div>
              <div className="check-row is-done">
                <CheckOutlined />
                <span>Подтвердить поставку оборудования</span>
              </div>
              <div className="check-row is-done">
                <CheckOutlined />
                <span>Проверить кассовую зону</span>
              </div>
              <div className="check-row is-done">
                <CheckOutlined />
                <span>Разместить навигацию</span>
              </div>
              <div className="check-row">
                <i />
                <span>Загрузить фотографии зала</span>
              </div>
              <div className="check-row">
                <i />
                <span>Получить подтверждение руководителя</span>
              </div>
              <div className="task-preview__comments">
                <div className="task-preview__section-title">
                  <strong>Обсуждение</strong>
                  <span>2</span>
                </div>
                <div className="comment-row">
                  <span>АС</span>
                  <p>
                    <strong>Анна</strong>
                    <small>Проверьте зону выдачи до 16:00</small>
                  </p>
                </div>
                <div className="comment-input">
                  <CommentOutlined />
                  <span>Написать комментарий…</span>
                  <PaperClipOutlined />
                </div>
              </div>
            </section>
            <aside className="task-preview__aside">
              <dl>
                <div>
                  <dt>
                    <UserOutlined /> Ответственный
                  </dt>
                  <dd>
                    <span>ИК</span> Игорь К.
                  </dd>
                </div>
                <div>
                  <dt>
                    <CalendarOutlined /> Срок
                  </dt>
                  <dd className="is-warning">Сегодня, 17:00</dd>
                </div>
                <div>
                  <dt>
                    <TeamOutlined /> Наблюдатели
                  </dt>
                  <dd>Анна, Мария +2</dd>
                </div>
                <div>
                  <dt>
                    <PaperClipOutlined /> Вложения
                  </dt>
                  <dd>brief.pdf · 1,8 МБ</dd>
                </div>
              </dl>
              <div className="task-preview__history">
                <HistoryOutlined />
                <div>
                  <strong>История задачи</strong>
                  <small>12 событий сохранено</small>
                </div>
                <span>→</span>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <figcaption>
        <span>Карточка задачи</span> Чек-лист, файлы, обсуждение и приёмка результата
      </figcaption>
    </BrowserFrame>
  );
}

export function MobileScene() {
  return (
    <div className="mobile-scene" role="img" aria-label="Демонстрационный мобильный экран Taskspot">
      <div className="mobile-scene__speaker" />
      <header>
        <MenuOutlined />
        <strong>Сегодня</strong>
        <BellOutlined />
      </header>
      <div className="mobile-scene__hello">
        <small>Добрый день, Игорь</small>
        <h3>3 задачи в фокусе</h3>
      </div>
      <div className="mobile-scene__tabs">
        <span className="is-active">Мои</span>
        <span>На проверке</span>
        <span>Все</span>
      </div>
      <div className="mobile-card mobile-card--urgent">
        <div>
          <span>Сегодня · 17:00</span>
          <em>В работе</em>
        </div>
        <strong>Подготовить открытие магазина</strong>
        <small>
          <FolderOpenOutlined /> Запуск точки
        </small>
        <div className="mobile-card__progress">
          <i>
            <b />
          </i>
          <span>3/5</span>
        </div>
      </div>
      <div className="mobile-card">
        <div>
          <span>Завтра · 12:00</span>
          <em>Новая</em>
        </div>
        <strong>Сверить остатки на складе</strong>
        <small>
          <FolderOpenOutlined /> Операционные задачи
        </small>
      </div>
      <span className="mobile-scene__add" aria-hidden="true">
        <PlusOutlined />
      </span>
      <nav>
        <span className="is-active">
          <UnorderedListOutlined />
          Задачи
        </span>
        <span>
          <AppstoreOutlined />
          Контроль
        </span>
        <span>
          <BellOutlined />
          Входящие
        </span>
        <span>
          <UserOutlined />
          Профиль
        </span>
      </nav>
    </div>
  );
}
