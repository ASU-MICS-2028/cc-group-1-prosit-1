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
    // The farmer's own app (Figma 23, My Profile, Help; later prices and money).
    path: "/farmer",
    loader: requireRole("farmer"),
    HydrateFallback: Loading,
    lazy: () => import("@/features/farmer/FarmerLayout"),
    children: [
      { index: true, lazy: () => import("@/features/farmer/FarmerHomePage") },
      { path: "help", lazy: () => import("@/features/account/HelpPage") },
      {
        path: "profile",
        lazy: () => import("@/features/farmer/FarmerProfilePage"),
      },
      // Market is a place in the farmer's menu; the other services open from Home with a back button.
      { path: "prices", lazy: () => import("@/features/farmer/PricesPage") },
      {
        path: "details",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmer/MyDetailsPage"),
      },
      {
        path: "details/change",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmer/ChangeDetailsPage"),
      },
      {
        path: "weather",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmer/WeatherPage"),
      },
      {
        path: "crop-check",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmer/CropCheckPage"),
      },
      {
        path: "harvest",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmer/HarvestPage"),
      },
      {
        path: "cooperative",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmer/CooperativePage"),
      },
      {
        path: "lessons",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmer/LessonsPage"),
      },
      {
        path: "profile/language",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/account/ChangeLanguagePage"),
      },
      {
        path: "install",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/account/InstallPage"),
      },
    ],
  },
  {
    // Register a farmer: a full screen with its own header and Back/Next, no navigation,
    // so the officer cannot lose a half-done form by tapping a menu by mistake.
    path: "/register",
    loader: requireRole("officer"),
    HydrateFallback: Loading,
    children: [
      {
        index: true,
        lazy: () => import("@/features/registration/RegisterPage"),
      },
    ],
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
        // After saving: inside the app (sidebar on computers), but no bottom bar on phones
        path: "register/saved",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/registration/SavedPage"),
      },
      {
        path: "farmers",
        lazy: () => import("@/features/farmers/FarmerListPage"),
      },
      // Sub-pages with a back button have no bottom bar on phones (Figma 14, 15, 20, 24, 27).
      {
        path: "farmers/:id",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmers/FarmerDetailPage"),
      },
      {
        path: "farmers/:id/edit/:section",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/farmers/EditFarmerPage"),
      },
      {
        path: "farmers/:id/visit",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/visits/LogVisitPage"),
      },
      { path: "visits", lazy: () => import("@/features/visits/VisitsPage") },
      {
        path: "sync",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/sync/SyncPage"),
      },
      {
        path: "profile",
        lazy: () => import("@/features/profile/ProfilePage"),
      },
      {
        path: "profile/language",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/account/ChangeLanguagePage"),
      },
      {
        path: "help",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/account/HelpPage"),
      },
      {
        path: "install",
        handle: { hideBottomNav: true },
        lazy: () => import("@/features/account/InstallPage"),
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
