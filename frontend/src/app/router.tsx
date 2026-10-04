import { createBrowserRouter } from "react-router-dom"
import { AppLayout } from "./AppLayout"

// Every page is its own chunk (`lazy`), so the first screen only downloads
// the code it needs. Each page module exports a component named `Component`.
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, lazy: () => import("@/features/home/HomePage") },
      {
        path: "register",
        lazy: () => import("@/features/registration/RegisterPage"),
      },
      {
        path: "farmers",
        lazy: () => import("@/features/farmers/FarmerListPage"),
      },
      {
        path: "farmers/:id",
        lazy: () => import("@/features/farmers/FarmerDetailPage"),
      },
      {
        path: "settings",
        lazy: () => import("@/features/settings/SettingsPage"),
      },
      { path: "*", lazy: () => import("@/features/NotFoundPage") },
    ],
  },
])
