import { Input } from "antd";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function GlobalSearch() {
  const location = useLocation();
  const navigate = useNavigate();
  const [text, setText] = useState("");
  useEffect(() => {
    if (location.pathname === "/app/search") setText(new URLSearchParams(location.search).get("q") || "");
  }, [location.pathname, location.search]);
  function search(value) {
    const q = value.trim();
    if (q) navigate("/app/search?" + new URLSearchParams({ q }));
    else if (location.pathname === "/app/search") navigate("/app/search");
  }
  return <Input.Search className="app-layout__global-search" aria-label="Поиск по всем задачам"
    placeholder="Поиск по всем задачам" allowClear maxLength={200}
    value={text} onChange={(event) => setText(event.target.value)} onSearch={search} />;
}
