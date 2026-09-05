export function readTaskListState(params) {
  const positiveInteger = (value, fallback) => /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value) : fallback;
  const sorts = ["updatedAt:desc", "createdAt:desc", "dueDate:asc", "description:asc"];
  const statuses = ["open", "in_progress", "review", "closed"];
  const status = statuses.includes(params.get("status")) ? params.get("status") : undefined;
  const limit = positiveInteger(params.get("limit"), 25);
  return {
    page: positiveInteger(params.get("page"), 1),
    pageSize: [25, 50, 100].includes(limit) ? limit : 25,
    searchQuery: (params.get("search") || "").slice(0, 200).trim(),
    sort: sorts.includes(params.get("sort")) ? params.get("sort") : "updatedAt:desc",
    statusFilter: status,
    categoryFilter: params.get("category") || undefined,
    hideClosed: status !== "closed" && params.get("hideClosed") !== "false"
  };
}

export function updateTaskListParams(params, changes, { resetPage = true } = {}) {
  const next = new URLSearchParams(params);
  if (resetPage) next.delete("page");
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
  }
  if (changes.status === "closed") next.set("hideClosed", "false");
  if (changes.hideClosed === true && next.get("status") === "closed") next.delete("status");
  return next;
}
