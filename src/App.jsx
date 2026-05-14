import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { App as AntApp, Spin } from "antd";
import { apiFetch, getToken, setToken } from "./api.js";
import { AppLayout } from "./components/AppLayout/AppLayout.jsx";
import { AuthPage } from "./components/AuthPage/AuthPage.jsx";
import { LandingPage } from "./components/LandingPage/LandingPage.jsx";

const Dashboard = lazy(() => import("./components/Dashboard/Dashboard.jsx").then((module) => ({ default: module.Dashboard })));
const CalendarPage = lazy(() => import("./components/CalendarPage/CalendarPage.jsx").then((module) => ({ default: module.CalendarPage })));
const BillingPage = lazy(() => import("./components/BillingPage/BillingPage.jsx").then((module) => ({ default: module.BillingPage })));
const ControlPage = lazy(() => import("./components/ControlPage/ControlPage.jsx").then((module) => ({ default: module.ControlPage })));
const Onboarding = lazy(() => import("./components/Onboarding/Onboarding.jsx").then((module) => ({ default: module.Onboarding })));
const OverdueTasks = lazy(() => import("./components/OverdueTasks/OverdueTasks.jsx").then((module) => ({ default: module.OverdueTasks })));
const Profile = lazy(() => import("./components/Profile/Profile.jsx").then((module) => ({ default: module.Profile })));
const ProjectTasks = lazy(() => import("./components/Projects/ProjectTasks.jsx").then((module) => ({ default: module.ProjectTasks })));
const Projects = lazy(() => import("./components/Projects/Projects.jsx").then((module) => ({ default: module.Projects })));
const TaskDetails = lazy(() => import("./components/Tasks/TaskDetails.jsx").then((module) => ({ default: module.TaskDetails })));
const TemplatesPage = lazy(() => import("./components/TemplatesPage/TemplatesPage.jsx").then((module) => ({ default: module.TemplatesPage })));

function RouteLoader() {
  return (
    <div className="route-loader">
      <Spin />
    </div>
  );
}

export function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;

    apiFetch("/auth/me")
      .then(({ user: currentUser }) => setUser(currentUser))
      .catch(() => setToken(null))
      .finally(() => setLoading(false));
  }, []);

  const auth = useMemo(
    () => ({
      user,
      async signIn(path, values) {
        const data = await apiFetch(path, {
          method: "POST",
          body: JSON.stringify(values)
        });
        setToken(data.token);
        setUser(data.user);
      },
      signOut() {
        setToken(null);
        setUser(null);
      },
      setUser
    }),
    [user]
  );

  if (loading) {
    return (
      <div className="page-shell" style={{ display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <AntApp>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage user={user} />} />
          <Route path="/login" element={<AuthPage mode="login" auth={auth} />} />
          <Route path="/register" element={<AuthPage mode="register" auth={auth} />} />
          <Route
            path="/app"
            element={user ? <AppLayout auth={auth} /> : <Navigate to="/login" replace />}
          >
            <Route index element={<Suspense fallback={<RouteLoader />}><Onboarding currentUser={user} /></Suspense>} />
            <Route path="onboarding" element={<Suspense fallback={<RouteLoader />}><Onboarding currentUser={user} /></Suspense>} />
            <Route path="dashboard" element={<Suspense fallback={<RouteLoader />}><Dashboard currentUser={user} /></Suspense>} />
            <Route path="control" element={<Suspense fallback={<RouteLoader />}><ControlPage /></Suspense>} />
            <Route path="calendar" element={<Suspense fallback={<RouteLoader />}><CalendarPage /></Suspense>} />
            <Route path="overdue" element={<Suspense fallback={<RouteLoader />}><OverdueTasks /></Suspense>} />
            <Route path="templates" element={<Suspense fallback={<RouteLoader />}><TemplatesPage currentUser={user} /></Suspense>} />
            <Route path="billing" element={<Suspense fallback={<RouteLoader />}><BillingPage /></Suspense>} />
            <Route path="projects" element={<Suspense fallback={<RouteLoader />}><Projects user={user} /></Suspense>} />
            <Route path="projects/:projectId/tasks" element={<Suspense fallback={<RouteLoader />}><ProjectTasks currentUser={user} /></Suspense>} />
            <Route path="tasks/:taskId" element={<Suspense fallback={<RouteLoader />}><TaskDetails currentUser={user} /></Suspense>} />
            <Route path="profile" element={<Suspense fallback={<RouteLoader />}><Profile auth={auth} /></Suspense>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}
