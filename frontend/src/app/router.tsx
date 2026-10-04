import { createBrowserRouter, type RouteObject } from "react-router-dom"
import { AppLayout } from "./AppLayout"
import { Loading } from "./Loading"

// Every page is its own chunk (`lazy`), so the first screen only downloads
// the code it needs. Each page module exports a component named `Component`.
export const routes: RouteObject[] = [
  {
    path: "/",
    element: <AppLayout />,
    HydrateFallback: Loading,
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
]

export const router = createBrowserRouter(routes)
