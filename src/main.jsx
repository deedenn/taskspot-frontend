import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider } from "antd";
import ruRU from "antd/locale/ru_RU";
import "antd/dist/reset.css";
import "./styles.css";
import { App } from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider
      locale={ruRU}
      theme={{
        token: {
          colorPrimary: "#1f7a8c",
          borderRadius: 8,
          fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
        }
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>
);
