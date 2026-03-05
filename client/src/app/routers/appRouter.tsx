import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/home";
import { ArchivePage } from "@/pages/archive/ui/ArchivePage";
// import { AdminPage } from '@/pages/admin';

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/archive",
    element: <ArchivePage />,
  },
  {
    path: "/admin",
    // element: <AdminPage />,
    element: <div>Admin</div>,
  },
]);
