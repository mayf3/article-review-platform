import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { KanbanPage } from "./pages/KanbanPage";
import { ArticleDetailPage } from "./pages/ArticleDetailPage";
import "./styles.css";

function KanbanRoute() {
  const navigate = useNavigate();
  return <KanbanPage onOpenArticle={(articleId) => navigate(`/articles/${articleId}`)} />;
}

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<KanbanRoute />} />
        <Route path="/articles/:id" element={<ArticleDetailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
