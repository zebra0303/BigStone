import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/home";
import { SearchPage } from "@/pages/search";
import { AdminPage } from '@/pages/admin';

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/search",
    element: <SearchPage />,
  },
  {
    path: "/admin",
    element: <AdminPage />,
  },
]);
