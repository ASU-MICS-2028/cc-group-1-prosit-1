import {
  createBrowserRouter,
  redirect,
  type RouteObject,
} from "react-router-dom"
import { hasChosenLanguage } from "@/i18n"
import { AppLayout } from "./AppLayout"
import { Loading } from "./Loading"

// Every page is its own chunk (`lazy`), so the first screen only downloads
// the code it needs. Each page module exports a component named `Component`.
export const routes: RouteObject[] = [
  {
    // First run: choose a language before anything else (full screen, no navigation).
    path: "/welcome",
    lazy: () => import("@/features/welcome/WelcomePage"),
    HydrateFallback: Loading,
  },
  {
    path: "/",
    element: <AppLayout />,
    loader: () => (hasChosenLanguage() ? null : redirect("/welcome")),
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
      { path: "sync", lazy: () => import("@/features/sync/SyncPage") },
      {
        path: "profile",
        lazy: () => import("@/features/profile/ProfilePage"),
      },
      // The component sheet is for development only and is left out of the production build.
      ...(import.meta.env.DEV
        ? [
            {
              path: "design",
              lazy: () => import("@/features/design/DesignPage"),
            },
          ]
        : []),
      { path: "*", lazy: () => import("@/features/NotFoundPage") },
    ],
  },
]

export const router = createBrowserRouter(routes)
