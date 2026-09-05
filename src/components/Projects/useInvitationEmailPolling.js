import { useEffect } from "react";
import { apiFetch } from "../../api";

export function mergeInvitationEmailStatuses(current, fresh) {
  const merged = current.map((invitation) => {
    const update = fresh.find((item) => item._id === invitation._id && item.token === invitation.token);
    if (!update || invitation.emailStatus !== "pending" || invitation.status !== "pending") return invitation;
    if (invitation.emailStatus === update.emailStatus && invitation.emailError === update.emailError &&
        invitation.emailSentAt === update.emailSentAt) return invitation;
    return { ...invitation, emailStatus: update.emailStatus, emailError: update.emailError, emailSentAt: update.emailSentAt };
  });
  return merged.every((item, index) => item === current[index]) ? current : merged;
}

export function useInvitationEmailPolling(projectId, pending, setProjects) {
  useEffect(() => {
    if (!projectId || !pending) return undefined;
    let stopped = false;
    let timer;
    const controller = new AbortController();
    async function refresh() {
      try {
        if (document.visibilityState === "hidden") return;
        const { project } = await apiFetch(`/projects/${projectId}`, { signal: controller.signal });
        if (!stopped) {
          setProjects((projects) => {
            const current = projects.find((item) => item._id === projectId);
            if (!current) return projects;
            const invitations = mergeInvitationEmailStatuses(current.invitations || [], project.invitations || []);
            if (invitations === current.invitations) return projects;
            return projects.map((item) => item === current ? { ...item, invitations } : item);
          });
        }
      } catch {
        // A transient poll failure must not discard the project or reset its forms.
      } finally {
        if (!stopped) timer = window.setTimeout(refresh, 10000);
      }
    }
    timer = window.setTimeout(refresh, 5000);
    return () => {
      stopped = true;
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [projectId, pending, setProjects]);
}
