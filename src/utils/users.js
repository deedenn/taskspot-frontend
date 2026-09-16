export function fullName(user, fallback = "Пользователь") {
  const value = [user?.name, user?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return value || user?.email || fallback;
}

export function userOptionLabel(user) {
  return `${fullName(user)} · ${user?.email || "email не указан"}`;
}

function idOf(value) {
  return value?._id || value;
}

export function projectMemberOptions(project) {
  return (project?.members || [])
    .map((member) => ({
      value: idOf(member.user),
      label: userOptionLabel(member.user)
    }))
    .filter((option) => option.value);
}

export function projectAssigneeOptions(project) {
  return [
    ...projectMemberOptions(project),
    ...(project?.invitations || [])
      .filter((invitation) => invitation.status === "pending" && invitation.email)
      .map((invitation) => ({
        value: `pending:${invitation.email.toLowerCase()}`,
        label: `${invitation.email} · ожидает активации`
      }))
  ];
}

export function taskAssigneeValue(task) {
  if (task?.assignee) return idOf(task.assignee);
  if (task?.assigneeEmail) return `pending:${task.assigneeEmail.toLowerCase()}`;
  return "";
}
