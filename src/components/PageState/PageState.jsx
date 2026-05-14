import { Alert, Button, Empty } from "antd";
import "./PageState.css";

export function PageState({ actionText = "Повторить", description, onAction, title, type = "empty" }) {
  if (type === "error") {
    return (
      <Alert
        className="page-state"
        type="error"
        showIcon
        message={title || "Не удалось загрузить данные"}
        description={description}
        action={
          onAction ? (
            <Button size="small" danger onClick={onAction}>
              {actionText}
            </Button>
          ) : null
        }
      />
    );
  }

  return (
    <Empty
      className="page-state page-state--empty"
      description={description || title}
    >
      {onAction && <Button onClick={onAction}>{actionText}</Button>}
    </Empty>
  );
}
