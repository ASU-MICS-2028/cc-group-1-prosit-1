import { createBrowserRouter, type RouteObject } from "react-router-dom"
import { AppLayout } from "./AppLayout"
import { requireRole, signedOutOnly } from "./guards"
import { Loading } from "./Loading"

// Every page is its own chunk (`lazy`), so the first screen only downloads
// the code it needs. Each page module exports a component named `Component`.
export const routes: RouteObject[] = [
  {
    // Start and log in: full screens without navigation, for people who are not signed in.
    loader: signedOutOnly,
    HydrateFallback: Loading,
    children: [
      { path: "/welcome", lazy: () => import("@/features/start/WelcomePage") },
      {
        path: "/language",
        lazy: () => import("@/features/start/LanguagePage"),
      },
      { path: "/who", lazy: () => import("@/features/start/WhoPage") },
      {
        path: "/login/:role",
        lazy: () => import("@/features/start/LoginPage"),
      },
      {
        path: "/login/:role/code",
        lazy: () => import("@/features/start/CodePage"),
      },
    ],
  },
  {
    // The farmer's own app (their profile, help, later prices and money).
    path: "/farmer",
    loader: requireRole("farmer"),
    HydrateFallback: Loading,
    lazy: () => import("@/features/farmer/FarmerHomePage"),
  },
  {
    // The extension officer's app.
    path: "/",
    element: <AppLayout />,
    loader: requireRole("officer"),
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
