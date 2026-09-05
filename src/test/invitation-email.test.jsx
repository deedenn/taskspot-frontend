// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../api";
import { mergeInvitationEmailStatuses, useInvitationEmailPolling } from "../components/Projects/useInvitationEmailPolling";

vi.mock("../api", () => ({ apiFetch: vi.fn() }));
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); vi.resetAllMocks(); });

describe("invitation delivery status", () => {
  const pending = { _id: "invite", token: "new", status: "pending", emailStatus: "pending", email: "user@example.com" };

  it("updates delivery fields without replacing locally edited project data", () => {
    const [result] = mergeInvitationEmailStatuses([pending], [{ ...pending, emailStatus: "sent", email: "other@example.com" }]);
    expect(result.emailStatus).toBe("sent");
    expect(result.email).toBe(pending.email);
  });

  it("retains the array when a poll returns unchanged statuses", () => {
    const current = [pending];
    expect(mergeInvitationEmailStatuses(current, [{ ...pending }])).toBe(current);
  });

  it("does not overwrite a resend or restore a removed invitation from a stale response", () => {
    expect(mergeInvitationEmailStatuses([pending], [{ ...pending, token: "old", emailStatus: "sent" }])[0]).toBe(pending);
    expect(mergeInvitationEmailStatuses([], [pending])).toEqual([]);
    const failed = { ...pending, emailStatus: "failed" };
    expect(mergeInvitationEmailStatuses([failed], [{ ...pending, emailStatus: "pending" }])[0]).toBe(failed);
  });

  it("polls queued invitations and stops when there are none or the view unmounts", async () => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    apiFetch.mockResolvedValue({ project: { invitations: [{ ...pending, emailStatus: "sent" }] } });
    const setProjects = vi.fn();
    const { rerender, unmount } = renderHook(({ queued }) => useInvitationEmailPolling("project", queued, setProjects),
      { initialProps: { queued: true } });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    const update = setProjects.mock.calls[0][0];
    expect(update([{ _id: "project", name: "Untouched", invitations: [pending] }])[0].invitations[0].emailStatus).toBe("sent");
    rerender({ queued: false });
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(apiFetch.mock.calls[0][1].signal.aborted).toBe(true);
    unmount();
    vi.restoreAllMocks();
  });

  it("keeps project data on a temporary poll error and retries", async () => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    apiFetch.mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ project: { invitations: [] } });
    const setProjects = vi.fn();
    const { unmount } = renderHook(() => useInvitationEmailPolling("project", true, setProjects));
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(setProjects).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(10000); });
    expect(apiFetch).toHaveBeenCalledTimes(2);
    unmount();
    vi.restoreAllMocks();
  });
});
