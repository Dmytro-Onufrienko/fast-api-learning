import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createBrowserRouter, Navigate } from "react-router-dom";

import "./index.css";
import { AppShell } from "./components/AppShell";
import { ModuleListPage } from "./pages/ModuleListPage";
import { LessonPage } from "./pages/LessonPage";
import { ContentErrorPage } from "./pages/ContentErrorPage";
import { contentLoadError } from "./content/registry";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <ModuleListPage /> },
      { path: "lesson/:lessonId", element: <LessonPage /> },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root")!);

// A malformed manifest is a hard stop, not a degraded experience: rendering
// half the lessons and silently dropping the broken one is exactly how
// content rot goes unnoticed.
root.render(
  <React.StrictMode>
    {contentLoadError ? (
      <ContentErrorPage error={contentLoadError} />
    ) : (
      <RouterProvider router={router} />
    )}
  </React.StrictMode>,
);
