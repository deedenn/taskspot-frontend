import { describe, expect, it } from "vitest";
import {
  projectAssigneeOptions,
  projectMemberOptions,
  taskAssigneeValue
} from "../utils/users.js";

const member = {
  _id: "member-1",
  name: "Анна",
  lastName: "Смирнова",
  email: "anna@example.test"
};

const project = {
  members: [{ user: member, role: "member" }],
  invitations: [
    { email: "new@example.test", status: "pending" },
    { email: "accepted@example.test", status: "accepted" }
  ]
};

describe("pending task assignee", () => {
  it("adds pending invitations to the assignee list but not to observers", () => {
    expect(projectMemberOptions(project)).toEqual([
      { value: "member-1", label: "Анна Смирнова · anna@example.test" }
    ]);
    expect(projectAssigneeOptions(project)).toEqual([
      { value: "member-1", label: "Анна Смирнова · anna@example.test" },
      { value: "pending:new@example.test", label: "new@example.test · ожидает активации" }
    ]);
  });

  it("keeps a pending assignee selected while task details are edited", () => {
    expect(taskAssigneeValue({ assigneeEmail: "NEW@EXAMPLE.TEST" })).toBe("pending:new@example.test");
    expect(taskAssigneeValue({ assignee: member, assigneeEmail: "old@example.test" })).toBe("member-1");
    expect(taskAssigneeValue({})).toBe("");
  });
});
