export const YANDEX_METRIKA_ID = 113730343;

export const YANDEX_METRIKA_GOALS = {
  landingCta: "landing_cta_click",
  registrationSubmitted: "registration_submitted",
  registrationCompleted: "ym-register"
};

const ALLOWED_QUERY_PARAMETERS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "yclid",
  "gclid",
  "_openstat"
]);

function normalizeAnalyticsPath(pathname) {
  if (/^\/app\/tasks\/[^/]+$/.test(pathname)) return "/app/tasks/:taskId";
  if (/^\/app\/projects\/[^/]+\/tasks$/.test(pathname)) return "/app/projects/:projectId/tasks";
  if (/^\/app\/projects\/[^/]+$/.test(pathname)) return "/app/projects/:projectId";
  return pathname || "/";
}

export function buildAnalyticsUrl(location, origin = window.location.origin) {
  const url = new URL(normalizeAnalyticsPath(location.pathname), origin);
  const search = new URLSearchParams(location.search || "");

  search.forEach((value, key) => {
    if (ALLOWED_QUERY_PARAMETERS.has(key)) {
      url.searchParams.append(key, value);
    }
  });

  return url.href;
}

export function trackYandexPageView(url, { referer = "", title = document.title } = {}) {
  if (typeof window === "undefined" || typeof window.ym !== "function") return false;

  const options = { title };
  if (referer) options.referer = referer;
  window.ym(YANDEX_METRIKA_ID, "hit", url, options);
  return true;
}

export function reachYandexGoal(goal, params) {
  if (typeof window === "undefined" || typeof window.ym !== "function") return false;

  window.ym(YANDEX_METRIKA_ID, "reachGoal", goal, params);
  return true;
}
