import { CheckCircleOutlined, FolderAddOutlined, SendOutlined } from "@ant-design/icons";
import { Button, Card, Empty, List, Space, Steps, Typography, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api.js";
import "./Onboarding.css";

export function Onboarding() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingDemo, setCreatingDemo] = useState(false);

  async function loadProjects() {
    setLoading(true);
    try {
      const data = await apiFetch("/projects");
      setProjects(data.projects);
    } catch (error) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  const hasProjects = projects.length > 0;
  const activeProject = projects[0];
  const currentStep = useMemo(() => {
    if (!hasProjects) return 0;
    if (!projects.some((project) => project.members.length > 1 || project.invitations?.length)) return 1;
    return 2;
  }, [hasProjects, projects]);

  async function createDemoProject() {
    setCreatingDemo(true);
    try {
      await apiFetch("/projects/demo", { method: "POST" });
      await loadProjects();
      message.success("Демо-проект создан");
    } catch (error) {
      message.error(error.message);
    } finally {
      setCreatingDemo(false);
    }
  }

  return (
    <section className="onboarding">
      <div className="onboarding__head">
        <div>
          <Typography.Title level={1}>Быстрый старт</Typography.Title>
          <Typography.Paragraph>
            Настройте первый рабочий сценарий: проект, участники и задача с ответственным.
          </Typography.Paragraph>
        </div>
      </div>

      <Card loading={loading}>
        <Steps
          current={currentStep}
          items={[
            { title: "Проект", icon: <FolderAddOutlined /> },
            { title: "Участники", icon: <SendOutlined /> },
            { title: "Первая задача", icon: <CheckCircleOutlined /> }
          ]}
        />

        <div className="onboarding__body">
          {!hasProjects ? (
            <div className="onboarding__choice">
              <Card>
                <Typography.Title level={3}>Создать демо-проект</Typography.Title>
                <Typography.Paragraph>
                  Добавим пример поручений, чек-лист и шаблон еженедельного отчёта.
                </Typography.Paragraph>
                <Button type="primary" loading={creatingDemo} onClick={createDemoProject}>
                  Создать демо
                </Button>
              </Card>
              <Card>
                <Typography.Title level={3}>Начать с чистого проекта</Typography.Title>
                <Typography.Paragraph>
                  Подходит, если вы уже знаете, какой процесс хотите контролировать.
                </Typography.Paragraph>
	                <Button onClick={() => navigate("/app/projects")}>
	                  Создать проект
	                </Button>
              </Card>
            </div>
          ) : (
            <div className="onboarding__next">
              <Typography.Title level={3}>{activeProject.name}</Typography.Title>
              <List
                dataSource={[
                  "Пригласите сотрудника по email в разделе проектов.",
                  "Поставьте первую задачу с ответственным и сроком.",
                  "Откройте страницу контроля, чтобы видеть просрочки и задачи на проверке."
                ]}
                renderItem={(item) => <List.Item>{item}</List.Item>}
              />
	              <Space wrap>
	                {currentStep === 2 && (
	                  <Button type="primary" onClick={() => navigate("/app/dashboard")}>
	                    Открыть главную
	                  </Button>
	                )}
	                <Button
	                  type={currentStep === 2 ? "default" : "primary"}
	                  onClick={() => navigate(`/app/projects/${activeProject._id}/tasks`)}
	                >
	                  Поставить задачу
	                </Button>
	                <Button onClick={() => navigate("/app/projects")}>
	                  Пригласить участника
	                </Button>
	                <Button onClick={() => navigate("/app/control")}>
	                  Открыть контроль
	                </Button>
              </Space>
            </div>
          )}

          {!loading && !projects.length && <Empty className="onboarding__empty" description="Начните с проекта или демо" />}
        </div>
      </Card>
    </section>
  );
}
