import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { App as AntApp, Spin } from "antd";
import { apiFetch, getToken, setToken } from "./api.js";
import { AppLayout } from "./components/AppLayout/AppLayout.jsx";
import { AuthPage } from "./components/AuthPage/AuthPage.jsx";
import { LandingPage } from "./components/LandingPage/LandingPage.jsx";

const Dashboard = lazy(() => import("./components/Dashboard/Dashboard.jsx").then((module) => ({ default: module.Dashboard })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard/AdminDashboard.jsx").then((module) => ({ default: module.AdminDashboard })));
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

function RequireRegularUser({ user, children }) {
  if (user?.isSuperAdmin) {
    return <Navigate to="/app/admin" replace />;
  }

  return children;
}

function RequireSuperAdmin({ user, children }) {
  if (!user?.isSuperAdmin) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
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
        return data.user;
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
            <Route index element={<Navigate to={user?.isSuperAdmin ? "/app/admin" : "/app/onboarding"} replace />} />
            <Route path="onboarding" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><Onboarding currentUser={user} /></Suspense></RequireRegularUser>} />
            <Route path="dashboard" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><Dashboard currentUser={user} /></Suspense></RequireRegularUser>} />
            <Route path="control" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><ControlPage /></Suspense></RequireRegularUser>} />
            <Route path="calendar" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><CalendarPage /></Suspense></RequireRegularUser>} />
            <Route path="overdue" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><OverdueTasks /></Suspense></RequireRegularUser>} />
            <Route path="templates" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><TemplatesPage currentUser={user} /></Suspense></RequireRegularUser>} />
            <Route path="billing" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><BillingPage /></Suspense></RequireRegularUser>} />
            <Route path="admin" element={<RequireSuperAdmin user={user}><Suspense fallback={<RouteLoader />}><AdminDashboard currentUser={user} /></Suspense></RequireSuperAdmin>} />
            <Route path="projects" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><Projects user={user} /></Suspense></RequireRegularUser>} />
            <Route path="projects/:projectId" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><Projects user={user} /></Suspense></RequireRegularUser>} />
            <Route path="projects/:projectId/tasks" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><ProjectTasks currentUser={user} /></Suspense></RequireRegularUser>} />
            <Route path="tasks/:taskId" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><TaskDetails currentUser={user} /></Suspense></RequireRegularUser>} />
            <Route path="profile" element={<RequireRegularUser user={user}><Suspense fallback={<RouteLoader />}><Profile auth={auth} /></Suspense></RequireRegularUser>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AntApp>
  );
}
