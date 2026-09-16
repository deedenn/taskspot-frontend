import { ClockCircleOutlined } from "@ant-design/icons";
import { DatePicker, Form, Switch, Typography } from "antd";
import "./TaskDeadlineField.css";

export function TaskDeadlineField({ form, className = "", disabled = false }) {
  const hasTime = Form.useWatch("dueDateHasTime", form) || false;

  return (
    <div className={`task-deadline-field ${className}`.trim()}>
      <Form.Item name="dueDate" label="Срок выполнения">
        <DatePicker
          className="task-deadline-field__picker"
          allowClear
          disabled={disabled}
          format={hasTime ? "DD.MM.YYYY HH:mm" : "DD.MM.YYYY"}
          placeholder={hasTime ? "Дата и время" : "Дата"}
          showTime={hasTime ? { format: "HH:mm", minuteStep: 5 } : false}
        />
      </Form.Item>
      <div className="task-deadline-field__time-row">
        <Form.Item name="dueDateHasTime" valuePropName="checked" noStyle initialValue={false}>
          <Switch size="small" disabled={disabled} aria-label="Указать точное время срока" />
        </Form.Item>
        <ClockCircleOutlined aria-hidden="true" />
        <Typography.Text type="secondary">
          {hasTime ? "Срок наступит в указанное время" : "Без времени - до конца выбранного дня"}
        </Typography.Text>
      </div>
    </div>
  );
}
