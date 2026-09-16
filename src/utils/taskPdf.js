import dayjs from "dayjs";
import { formatTaskDeadline } from "./taskDeadline.js";
import { fullName } from "./users.js";

const STATUS_LABELS = {
  open: "Открыта",
  in_progress: "В работе",
  review: "На проверке",
  done: "На проверке",
  closed: "Закрыта"
};

function text(value, fallback) {
  const result = String(value || "").trim();
  return result || fallback;
}

function assigneeName(task) {
  if (task.assignee) return fullName(task.assignee);
  return text(task.assigneeEmail, "Без ответственного");
}

export function buildTaskPdfDefinition(tasks, {
  title = "Задачи Taskspot",
  scope = "Текущий список на главной",
  generatedAt = new Date()
} = {}) {
  const rows = tasks.map((task, index) => [
    { text: String(index + 1), alignment: "right", color: "#64748b" },
    { text: text(task.description, "Без названия"), bold: true },
    text(task.project?.name, "Без проекта"),
    assigneeName(task),
    { text: formatTaskDeadline(task), noWrap: true },
    { text: STATUS_LABELS[task.status] || text(task.status, "Не указан"), noWrap: true }
  ]);

  return {
    info: {
      title,
      author: "Taskspot",
      subject: "Выгрузка задач"
    },
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [34, 42, 34, 42],
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: "Taskspot", color: "#64748b" },
        { text: `${currentPage} / ${pageCount}`, alignment: "right", color: "#64748b" }
      ],
      margin: [34, 10, 34, 0],
      fontSize: 8
    }),
    content: [
      {
        columns: [
          [
            { text: title, style: "title" },
            { text: scope, style: "scope" }
          ],
          {
            width: "auto",
            stack: [
              { text: `Задач: ${tasks.length}`, style: "count", alignment: "right" },
              { text: `Сформировано ${dayjs(generatedAt).format("DD.MM.YYYY, HH:mm")}`, style: "generated", alignment: "right" }
            ]
          }
        ],
        margin: [0, 0, 0, 18]
      },
      tasks.length
        ? {
            table: {
              headerRows: 1,
              widths: [24, "*", 105, 120, 94, 78],
              body: [
                ["№", "Задача", "Проект", "Ответственный", "Срок", "Статус"].map((label) => ({ text: label, style: "tableHeader" })),
                ...rows
              ]
            },
            layout: {
              fillColor: (rowIndex) => rowIndex === 0 ? "#e8f0ff" : rowIndex % 2 === 0 ? "#f8fafc" : null,
              hLineColor: () => "#dbe3ef",
              vLineColor: () => "#dbe3ef",
              paddingLeft: () => 7,
              paddingRight: () => 7,
              paddingTop: () => 7,
              paddingBottom: () => 7
            }
          }
        : { text: "По выбранным фильтрам задач нет.", style: "empty" }
    ],
    defaultStyle: {
      font: "Roboto",
      fontSize: 9,
      color: "#172033",
      lineHeight: 1.25
    },
    styles: {
      title: { fontSize: 22, bold: true, color: "#172033" },
      scope: { fontSize: 10, color: "#64748b", margin: [0, 5, 0, 0] },
      count: { fontSize: 12, bold: true, color: "#2563eb" },
      generated: { fontSize: 8, color: "#64748b", margin: [0, 4, 0, 0] },
      tableHeader: { bold: true, color: "#1e3a8a", fontSize: 9 },
      empty: { alignment: "center", color: "#64748b", margin: [0, 80, 0, 0], fontSize: 12 }
    }
  };
}

export async function downloadTaskPdf(tasks, options = {}) {
  const [{ default: pdfMake }, { default: virtualFonts }] = await Promise.all([
    import("pdfmake/build/pdfmake.js"),
    import("pdfmake/build/vfs_fonts.js")
  ]);
  pdfMake.addVirtualFileSystem(virtualFonts);
  const definition = buildTaskPdfDefinition(tasks, options);
  const filename = `taskspot-tasks-${dayjs().format("YYYY-MM-DD")}.pdf`;
  pdfMake.createPdf(definition).download(filename);
  return filename;
}
