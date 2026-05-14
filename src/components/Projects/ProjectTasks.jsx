import { ArrowLeftOutlined } from "@ant-design/icons";
import { Card, Spin, Tag, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch } from "../../api.js";
import { PageState } from "../PageState/PageState.jsx";
import { TaskWorkspace } from "../Tasks/TaskWorkspace.jsx";
import "./ProjectTasks.css";

function userId(user) {
  return user?._id || user;
}

export function ProjectTasks({ currentUser }) {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadProject() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch(`/projects/${projectId}`);
      setProject(data.project);
    } catch (error) {
      setError(error.message);
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  if (loading) {
    return (
      <div className="project-tasks__loader">
        <Spin size="large" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card>
        <PageState
          type={error ? "error" : "empty"}
          title="Проект не найден или недоступен"
          description={error}
          onAction={error ? loadProject : undefined}
        />
      </Card>
    );
  }

  const currentMember = project.members.find((member) => userId(member.user) === currentUser?._id);

  return (
    <section className="project-tasks">
      <Link className="project-tasks__back" to="/app/projects">
        <ArrowLeftOutlined /> Назад к проектам
      </Link>

      <Card className="project-tasks__summary">
        <div>
          <Typography.Title level={1}>{project.name}</Typography.Title>
          <Typography.Paragraph>{project.description || "Без описания"}</Typography.Paragraph>
        </div>
        <Tag color={currentMember?.role === "admin" ? "green" : "blue"}>
          {currentMember?.role === "admin" ? "Администратор" : "Участник"}
        </Tag>
      </Card>

      <TaskWorkspace project={project} currentUser={currentUser} />
    </section>
  );
}
