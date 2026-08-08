import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { App as AntApp, Spin } from "antd";
import { apiFetch, getToken, setToken } from "./api.js";
import { AppLayout } from "./components/AppLayout/AppLayout.jsx";

const LandingPage = lazy(() => import("./components/LandingPage/LandingPage.jsx").then((module) => ({ default: module.LandingPage })));
const AuthPage = lazy(() => import("./components/AuthPage/AuthPage.jsx").then((module) => ({ default: module.AuthPage })));
const VerifyEmail = lazy(() => import("./components/VerifyEmail/VerifyEmail.jsx").then((module) => ({ default: module.VerifyEmail })));
const Dashboard = lazy(() => import("./components/Dashboard/Dashboard.jsx").then((module) => ({ default: module.Dashboard })));
const AdminDashboard = lazy(() => import("./components/AdminDashboard/AdminDashboard.jsx").then((module) => ({ default: module.AdminDashboard })));
const CalendarPage = lazy(() => import("./components/CalendarPage/CalendarPage.jsx").then((module) => ({ default: module.CalendarPage })));
const BillingPage = lazy(() => import("./components/BillingPage/BillingPage.jsx").then((module) => ({ default: module.BillingPage })));
const ControlPage = lazy(() => import("./components/ControlPage/ControlPage.jsx").then((module) => ({ default: module.ControlPage })));
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

function RequireAuth({ user, children }) {
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ returnTo: `${location.pathname}${location.search}` }} />;
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

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
    }

    window.addEventListener("taskspot:unauthorized", handleUnauthorized);

    return () => window.removeEventListener("taskspot:unauthorized", handleUnauthorized);
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
          <Route path="/" element={<Suspense fallback={<RouteLoader />}><LandingPage user={user} /></Suspense>} />
          <Route path="/login" element={<Suspense fallback={<RouteLoader />}><AuthPage mode="login" auth={auth} /></Suspense>} />
          <Route path="/register" element={<Suspense fallback={<RouteLoader />}><AuthPage mode="register" auth={auth} /></Suspense>} />
          <Route path="/verify-email" element={<Suspense fallback={<RouteLoader />}><VerifyEmail auth={auth} /></Suspense>} />
          <Route
            path="/app"
            element={<RequireAuth user={user}><AppLayout auth={auth} /></RequireAuth>}
          >
            <Route index element={<Navigate to={user?.isSuperAdmin ? "/app/admin" : "/app/dashboard"} replace />} />
            <Route path="onboarding" element={<Navigate to="/app/dashboard" replace />} />
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
