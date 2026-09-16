import { describe, expect, it } from "vitest";
import dayjs from "dayjs";
import {
  effectiveTaskDeadline,
  formatTaskDeadline,
  isTaskDeadlinePast,
  taskDeadlinePayload
} from "../utils/taskDeadline.js";
import { buildTaskPdfDefinition } from "../utils/taskPdf.js";

describe("task deadline with optional time", () => {
  it("uses the end of day when the user leaves time disabled", () => {
    const payload = taskDeadlinePayload(dayjs("2026-09-16T00:00:00+03:00"), false);
    expect(payload).toEqual({
      dueDate: "2026-09-16T20:59:59.999Z",
      dueDateHasTime: false
    });
    const task = { ...payload, status: "open" };
    expect(formatTaskDeadline(task)).toBe("16.09.2026");
    expect(effectiveTaskDeadline(task).toISOString()).toBe(payload.dueDate);
    expect(isTaskDeadlinePast(task, dayjs("2026-09-16T20:00:00Z"))).toBe(false);
  });

  it("keeps and displays an explicitly selected time", () => {
    const payload = taskDeadlinePayload(dayjs("2026-09-16T14:35:44+03:00"), true);
    expect(payload).toEqual({
      dueDate: "2026-09-16T11:35:00.000Z",
      dueDateHasTime: true
    });
    expect(formatTaskDeadline(payload)).toBe("16.09.2026, 14:35");
  });
});

describe("task PDF definition", () => {
  it("contains project, assignee, deadline and localized status", () => {
    const definition = buildTaskPdfDefinition([{
      _id: "task-1",
      description: "Согласовать договор",
      project: { name: "Продажи" },
      assignee: { name: "Анна", lastName: "Смирнова" },
      dueDate: "2026-09-16T11:35:00.000Z",
      dueDateHasTime: true,
      status: "in_progress"
    }], { scope: "Ответственный · Продажи", generatedAt: "2026-09-16T09:00:00.000Z" });

    const table = definition.content[1].table;
    expect(table.body[0].map((cell) => cell.text)).toEqual([
      "№", "Задача", "Проект", "Ответственный", "Срок", "Статус"
    ]);
    expect(table.body[1]).toEqual(expect.arrayContaining([
      expect.objectContaining({ text: "Согласовать договор" }),
      "Продажи",
      "Анна Смирнова",
      expect.objectContaining({ text: "16.09.2026, 14:35" }),
      expect.objectContaining({ text: "В работе" })
    ]));
  });
});
