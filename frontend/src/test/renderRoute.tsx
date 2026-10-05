import { render } from "@testing-library/react"
import { RouterProvider, createMemoryRouter } from "react-router-dom"
import { routes } from "@/app/router"
import "@/i18n"

/**
 * Renders the app at a path. By default the person has already chosen a language;
 * pass `firstRun: true` to see the first-run language screen instead.
 */
export function renderRoute(path: string, { firstRun = false } = {}) {
  if (!firstRun) localStorage.setItem("agroconnect.lang", "en")
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return { router, ...render(<RouterProvider router={router} />) }
}
