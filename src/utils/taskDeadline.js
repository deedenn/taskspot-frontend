import dayjs from "dayjs";

export function taskDeadlinePayload(value, hasTime = false) {
  if (!value) return { dueDate: null, dueDateHasTime: false };

  const deadline = hasTime
    ? dayjs(value).second(0).millisecond(0)
    : dayjs(value).endOf("day");

  return {
    dueDate: deadline.toISOString(),
    dueDateHasTime: Boolean(hasTime)
  };
}

export function effectiveTaskDeadline(task) {
  if (!task?.dueDate) return null;
  const dueDate = dayjs(task.dueDate);
  if (!dueDate.isValid()) return null;
  return task.dueDateHasTime ? dueDate : dueDate.endOf("day");
}

export function formatTaskDeadline(task, fallback = "Без срока") {
  if (!task?.dueDate) return fallback;
  return dayjs(task.dueDate).format(task.dueDateHasTime ? "DD.MM.YYYY, HH:mm" : "DD.MM.YYYY");
}

export function isTaskDeadlinePast(task, now = dayjs()) {
  const deadline = effectiveTaskDeadline(task);
  return Boolean(deadline && deadline.isBefore(now));
}

export function isTaskDeadlineSoon(task, now = dayjs()) {
  const deadline = effectiveTaskDeadline(task);
  if (!deadline || deadline.isBefore(now)) return false;
  if (task.dueDateHasTime) return deadline.diff(now, "minute") <= 48 * 60;
  const daysLeft = deadline.startOf("day").diff(dayjs(now).startOf("day"), "day");
  return daysLeft >= 0 && daysLeft <= 1;
}
