import { describe, expect, it } from "vitest";
import { readTaskListState, updateTaskListParams } from "../components/Tasks/taskListState.js";

describe("project task list navigation", () => {
  it("restores a page and all filters after returning from a task", () => {
    const params = new URLSearchParams("page=3&limit=50&search=invoice&sort=dueDate:asc&status=review&category=cat&hideClosed=false");
    expect(readTaskListState(params)).toEqual({ page: 3, pageSize: 50, searchQuery: "invoice", sort: "dueDate:asc",
      statusFilter: "review", categoryFilter: "cat", hideClosed: false });
  });

  it("resets pagination when a filter changes while keeping the other filters", () => {
    const params = new URLSearchParams("page=3&limit=50&search=invoice&sort=dueDate:asc&category=cat");
    const state = readTaskListState(updateTaskListParams(params, { status: "review" }));
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(50);
    expect(state.searchQuery).toBe("invoice");
    expect(state.categoryFilter).toBe("cat");
    expect(params.get("page")).toBe("3");
  });

  it("does not allow the closed status and hide-closed switch to contradict each other", () => {
    let params = updateTaskListParams(new URLSearchParams("page=4"), { status: "closed" });
    expect(readTaskListState(params).hideClosed).toBe(false);
    params = updateTaskListParams(params, { hideClosed: true });
    expect(readTaskListState(params).statusFilter).toBeUndefined();
    expect(readTaskListState(params).page).toBe(1);
  });

  it("preserves filters when changing page and handles malformed URL values", () => {
    const params = updateTaskListParams(new URLSearchParams("status=open&search=report"), { page: 2 }, { resetPage: false });
    expect(readTaskListState(params).page).toBe(2);
    expect(readTaskListState(params).statusFilter).toBe("open");
    const invalid = readTaskListState(new URLSearchParams("page=Infinity&limit=10000&sort=bad&status=bad"));
    expect(invalid.page).toBe(1);
    expect(invalid.pageSize).toBe(25);
    expect(invalid.sort).toBe("updatedAt:desc");
    expect(invalid.statusFilter).toBeUndefined();
  });
});
