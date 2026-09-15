import { AlertOutlined, CheckCircleOutlined, ClockCircleOutlined, DownOutlined, TeamOutlined, UpOutlined } from "@ant-design/icons";
import { Tabs, Card, Empty, List, Space, Statistic, Tag, Typography, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { fullName } from "../../utils/users.js";
import { PageState } from "../PageState/PageState.jsx";
import "./ControlPage.css";
import { PeriodReport } from "./PeriodReport.jsx";

const statusLabels = {
  open: ["Открыта", "blue"],
  in_progress: ["В работе", "gold"],
  review: ["Проверка", "purple"],
  done: ["Проверка", "purple"],
  closed: ["Закрыта", "default"]
};

function TaskList({ tasks, empty, currentRoute }) {
  if (!tasks?.length) return <Empty description={empty} />;

  return (
    <List
      dataSource={tasks}
      renderItem={(task) => {
        const [label, color] = statusLabels[task.status] || [task.status, "default"];
        return (
          <List.Item>
            <List.Item.Meta
              title={
                <Space wrap>
                  <Link to={`/app/tasks/${task._id}`} state={{ returnTo: currentRoute }}>
                    {task.description}
                  </Link>
                  <Tag color={color}>{label}</Tag>
                </Space>
              }
              description={`${task.project?.name || "Проект"} · срок ${task.dueDate ? dayjs(task.dueDate).format("DD.MM.YYYY") : "Без срока"} · ${task.assignee ? fullName(task.assignee) : task.assigneeEmail || "без ответственного"}`}
            />
          </List.Item>
        );
      }}
    />
  );
}

function projectOverdueLink(projectKey) {
  const params = new URLSearchParams({ focus: "overdue" });
  if (projectKey && projectKey !== "no-project") params.set("project", projectKey);
  return `/app/dashboard?${params.toString()}`;
}

function initialsFor(name) {
  if (!name || name === "Без ответственного") return "—";
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function buildProjectWorkload(data) {
  const projects = new Map();

  (data?.byProject || []).forEach((project) => {
    projects.set(project.key, {
      key: project.key,
      name: project.name,
      active: project.active || 0,
      overdue: project.overdue || 0,
      review: project.review || 0,
      closed: project.closed || 0,
      assignees: []
    });
  });

  (data?.workloadByAssigneeProject || []).forEach((row) => {
    const key = row.projectKey || "no-project";
    const project = projects.get(key) || {
      key,
      name: row.project || "Без проекта",
      active: 0,
      overdue: 0,
      review: 0,
      closed: 0,
      assignees: []
    };

    if (!projects.has(key)) {
      projects.set(key, project);
    }

    project.assignees.push(row);
  });

  return Array.from(projects.values())
    .map((project) => ({
      ...project,
      assignees: project.assignees.sort(
        (a, b) => b.overdue - a.overdue || b.active - a.active || a.assignee.localeCompare(b.assignee, "ru")
      )
    }))
    .sort((a, b) => b.overdue - a.overdue || b.active - a.active || a.name.localeCompare(b.name, "ru"));
}

function ProjectMetric({ label, value, tone, to }) {
  const content = (
    <>
      <strong>{value}</strong>
      <span>{label}</span>
    </>
  );

  if (to) {
    return (
      <Link className={`control-page__project-metric control-page__project-metric--${tone}`} to={to}>
        {content}
      </Link>
    );
  }

  return <span className={`control-page__project-metric control-page__project-metric--${tone}`}>{content}</span>;
}

function ProjectWorkload({ projects, expandedProjects, onToggle }) {
  if (!projects.length) {
    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Данных по проектам пока нет" />;
  }

  return (
    <div className="control-page__project-list">
      {projects.map((project) => {
        const isOpen = expandedProjects.has(project.key);
        const contentId = `control-project-${project.key || "empty"}`;

        return (
          <section className="control-page__project" key={project.key}>
            <div className="control-page__project-top">
              <button
                type="button"
                className="control-page__project-toggle"
                aria-expanded={isOpen}
                aria-controls={contentId}
                aria-label={`${isOpen ? "Свернуть" : "Раскрыть"} проект ${project.name}`}
                onClick={() => onToggle(project.key)}
              >
                <span className="control-page__project-title">
                  <strong>{project.name}</strong>
                  <span>{project.assignees.length} ответственных</span>
                </span>
                <span className="control-page__project-chevron" aria-hidden="true">
                  {isOpen ? <UpOutlined /> : <DownOutlined />}
                </span>
              </button>
              <span className="control-page__project-metrics">
                <ProjectMetric label="Активные" value={project.active} tone="active" />
                <ProjectMetric label="Просрочены" value={project.overdue} tone="danger" to={projectOverdueLink(project.key)} />
                <ProjectMetric label="Проверка" value={project.review} tone="review" />
                <ProjectMetric label="Закрыты" value={project.closed} tone="closed" />
              </span>
            </div>

            {isOpen && (
              <div className="control-page__assignee-load" id={contentId}>
                {project.assignees.length ? (
                  project.assignees.map((assignee) => (
                    <div
                      className={assignee.assigneeKey === "unassigned" ? "control-page__assignee-row control-page__assignee-row--unassigned" : "control-page__assignee-row"}
                      key={assignee.key}
                    >
                      <span className="control-page__assignee-identity">
                        <span className="control-page__assignee-avatar" aria-hidden="true">
                          {initialsFor(assignee.assignee)}
                        </span>
                        <span className="control-page__assignee-name">
                          <strong>{assignee.assignee}</strong>
                          {assignee.email && <span>{assignee.email}</span>}
                        </span>
                      </span>
                      <span className="control-page__assignee-metrics" aria-label={`Нагрузка ${assignee.assignee}`}>
                        <span>Активные <strong>{assignee.active}</strong></span>
                        <span className="control-page__assignee-overdue">Просрочены <strong>{assignee.overdue}</strong></span>
                        <span>Проверка <strong>{assignee.review}</strong></span>
                        <span>Закрыты <strong>{assignee.closed}</strong></span>
                      </span>
                    </div>
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Ответственных в проекте нет" />
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

export function ControlPage() {
  return (
    <section className="control-page-shell">
      <div className="control-page__head">
        <Typography.Title level={1}>Контроль</Typography.Title>
        <Typography.Paragraph>
          Управленческий обзор: просрочки, проверка, нагрузка и закрытые задачи.
        </Typography.Paragraph>
      </div>
      <Tabs
        destroyOnHidden
        items={[
          { key: "current", label: "Текущая нагрузка", children: <OperationalControl /> },
          { key: "period", label: "Отчёты за период", children: <PeriodReport /> }
        ]}
      />
    </section>
  );
}

function OperationalControl() {
  const location = useLocation();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState(() => new Set());

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      setData(await apiFetch("/reports/control"));
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReport();
  }, []);

  const summary = data?.summary || {};
  const currentRoute = `${location.pathname}${location.search}`;
  const projectWorkload = useMemo(() => buildProjectWorkload(data), [data]);

  function toggleProject(projectKey) {
    setExpandedProjects((current) => {
      const next = new Set(current);
      if (next.has(projectKey)) next.delete(projectKey);
      else next.add(projectKey);
      return next;
    });
  }

  return (
    <section className="control-page">
      {error ? (
        <PageState
          type="error"
          description={error}
          onAction={loadReport}
        />
      ) : (
        <>
          <div className="control-page__stats">
            <Card loading={loading}><Statistic title="Активные" value={summary.active || 0} prefix={<TeamOutlined />} /></Card>
            <Link className="control-page__stat-link" to="/app/dashboard?focus=overdue" aria-label={`Открыть просроченные задачи: ${summary.overdue || 0}`}>
              <Card loading={loading}><Statistic title="Просрочены" value={summary.overdue || 0} prefix={<AlertOutlined />} valueStyle={{ color: "var(--danger)" }} /></Card>
            </Link>
            <Card loading={loading}><Statistic title="На проверке" value={summary.waitingReview || 0} prefix={<ClockCircleOutlined />} /></Card>
            <Card loading={loading}><Statistic title="Закрыто за месяц" value={summary.closedThisMonth || 0} prefix={<CheckCircleOutlined />} /></Card>
          </div>

          <div className="control-page__grid">
            <Card title="Просроченные задачи" loading={loading}>
              <TaskList tasks={data?.overdue} empty="Просроченных задач нет" currentRoute={currentRoute} />
            </Card>
            <Card title="Ждут проверки" loading={loading}>
              <TaskList tasks={data?.waitingReview} empty="Задач на проверке нет" currentRoute={currentRoute} />
            </Card>
          </div>

          <Card
            className="control-page__project-card"
            title="Проекты → ответственные"
            loading={loading}
          >
            <ProjectWorkload projects={projectWorkload} expandedProjects={expandedProjects} onToggle={toggleProject} />
          </Card>
        </>
      )}
    </section>
  );
}
