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
        path: "/farmer-on-computer",
        lazy: () => import("@/features/start/FarmerOnComputerPage"),
      },
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
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.CooperativeHome,
          })),
      },
      {
        path: "cooperative/savings",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.Savings,
          })),
      },
      {
        path: "cooperative/savings/done",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.SavingsAdded,
          })),
      },
      {
        path: "cooperative/meeting",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.Meeting,
          })),
      },
      {
        path: "cooperative/meeting/done",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.MeetingConfirmed,
          })),
      },
      {
        path: "cooperative/order",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.GroupOrder,
          })),
      },
      {
        path: "cooperative/order/done",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.OrderJoined,
          })),
      },
      {
        path: "cooperative/sell",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.SellTogether,
          })),
      },
      {
        path: "cooperative/sell/done",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/cooperative/cooperative").then((m) => ({
            Component: m.BagsAdded,
          })),
      },
      {
        path: "money",
        lazy: () =>
          import("@/features/money/home").then((m) => ({
            Component: m.MoneyHome,
          })),
      },
      {
        path: "money/link",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/link").then((m) => ({
            Component: m.LinkWallet,
          })),
      },
      {
        // Approve a payment on the phone; the app waits for the network (ADR 0034).
        path: "money/pay/:reference",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/pay").then((m) => ({
            Component: m.PaymentApproval,
          })),
      },
      {
        path: "money/link/done",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/link").then((m) => ({
            Component: m.WalletLinked,
          })),
      },
      {
        path: "money/buy",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/buy").then((m) => ({
            Component: m.ChooseInputs,
          })),
      },
      {
        path: "money/buy/shop",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/buy").then((m) => ({
            Component: m.ChooseShop,
          })),
      },
      {
        path: "money/buy/pay",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/buy").then((m) => ({
            Component: m.PayForInputs,
          })),
      },
      {
        path: "money/buy/paid",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/buy").then((m) => ({
            Component: m.InputsPaid,
          })),
      },
      {
        path: "money/delivery",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/buy").then((m) => ({
            Component: m.TrackDelivery,
          })),
      },
      {
        path: "money/loan",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/services").then((m) => ({
            Component: m.LoanOffer,
          })),
      },
      {
        path: "money/loan/amount",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/services").then((m) => ({
            Component: m.LoanAmount,
          })),
      },
      {
        path: "money/loan/sent",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/services").then((m) => ({
            Component: m.LoanSent,
          })),
      },
      {
        path: "money/insurance",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/services").then((m) => ({
            Component: m.Insurance,
          })),
      },
      {
        path: "money/insurance/done",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/services").then((m) => ({
            Component: m.Insured,
          })),
      },
      {
        path: "money/get-paid",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/services").then((m) => ({
            Component: m.GetPaid,
          })),
      },
      {
        path: "money/get-paid/sent",
        handle: { hideBottomNav: true },
        lazy: () =>
          import("@/features/money/services").then((m) => ({
            Component: m.PaymentRequested,
          })),
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
    // The MoFA admin's pages (ADR 0024): computer only, the admin sidebar beside each page.
    path: "/admin",
    loader: requireRole("admin"),
    HydrateFallback: Loading,
    lazy: () => import("@/features/admin/AdminLayout"),
    children: [
      {
        index: true,
        lazy: () => import("@/features/admin/AdminOverviewPage"),
      },
      {
        path: "regions",
        lazy: () =>
          import("@/features/admin/pages").then((m) => ({
            Component: m.Regions,
          })),
      },
      {
        path: "agents",
        lazy: () =>
          import("@/features/admin/pages").then((m) => ({
            Component: m.Agents,
          })),
      },
      {
        path: "cooperatives",
        lazy: () =>
          import("@/features/admin/pages").then((m) => ({
            Component: m.Cooperatives,
          })),
      },
      {
        path: "help-desk",
        lazy: () =>
          import("@/features/admin/pages").then((m) => ({
            Component: m.HelpDesk,
          })),
      },
      {
        path: "impact",
        lazy: () =>
          import("@/features/admin/pages").then((m) => ({
            Component: m.Impact,
          })),
      },
      {
        path: "system",
        lazy: () =>
          import("@/features/admin/pages").then((m) => ({
            Component: m.System,
          })),
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
        path: "requests",
        lazy: () =>
          import("@/features/officer/requests").then((m) => ({
            Component: m.Requests,
          })),
      },
      {
        path: "requests/:id",
        lazy: () =>
          import("@/features/officer/requests").then((m) => ({
            Component: m.Requests,
          })),
      },
      {
        path: "money",
        lazy: () =>
          import("@/features/officer/money").then((m) => ({
            Component: m.MoneyHealth,
          })),
      },
      {
        path: "money/loans",
        lazy: () =>
          import("@/features/officer/money").then((m) => ({
            Component: m.Loans,
          })),
      },
      {
        path: "money/loans/:id",
        lazy: () =>
          import("@/features/officer/money").then((m) => ({
            Component: m.Loans,
          })),
      },
      {
        path: "money/loans/:id/approved",
        lazy: () =>
          import("@/features/officer/money").then((m) => ({
            Component: m.LoanApproved,
          })),
      },
      {
        path: "market",
        lazy: () =>
          import("@/features/officer/money").then((m) => ({
            Component: m.OfficerMarket,
          })),
      },
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
