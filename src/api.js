export const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://api.taskspot.ru/api" : "http://localhost:4000/api");
const TOKEN_KEY = "taskflow_token";
const DEFAULT_TIMEOUT = 30000;

export class ApiError extends Error {
  constructor(message, { status, data } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export function isLimitError(error) {
  return error instanceof ApiError && (error.status === 402 || error.data?.code === "limit_exceeded");
}

export function limitErrorText(error) {
  if (!isLimitError(error)) {
    return error?.message || "Действие недоступно";
  }

  const usage = error.data?.usage;
  const plan = error.data?.plan?.name;
  const base = error.data?.message || error.message || "Лимит текущего тарифа исчерпан";

  const details = usage?.limit !== undefined
    ? `${base}: ${usage.used} / ${usage.limit}${plan ? ` на тарифе «${plan}»` : ""}.`
    : base;
  const actionText = error.data?.action || "Перейдите на другой тариф, чтобы продолжить работу.";
  const action = /перейдите|смените|выберите|продлите/i.test(details)
    ? ""
    : ` ${actionText}`;

  return `${details}${action}`;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const { timeout = DEFAULT_TIMEOUT, signal, responseType, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeout);

  if (signal) {
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  const headers = {
    ...(fetchOptions.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      signal: controller.signal
    });

    const data = response.ok && responseType === "blob" ? await response.blob() : await response.json().catch(() => ({}));

    if (response.status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent("taskspot:unauthorized"));
    }

    if (!response.ok) {
      const requestError = new ApiError(data.message || "Request failed", { status: response.status, data });

      if (isLimitError(requestError)) {
        requestError.message = limitErrorText(requestError);
        window.dispatchEvent(new CustomEvent("taskspot:plan-limit", {
          detail: {
            message: requestError.message,
            key: data.key,
            reason: data.reason,
            organization: data.organization,
            plan: data.plan,
            usage: data.usage
          }
        }));
      }

      throw requestError;
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new ApiError("Превышено время ожидания ответа сервера", { status: 0 });
    }

    if (error instanceof TypeError && error.message === "Failed to fetch") {
      throw new ApiError(`API недоступен: ${API_URL}. Проверьте backend, домен API и CORS.`, { status: 0 });
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
