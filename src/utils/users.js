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
