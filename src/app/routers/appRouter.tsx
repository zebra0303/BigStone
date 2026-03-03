import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "@/pages/home";
// import { ArchivePage } from '@/pages/archive';
// import { AdminPage } from '@/pages/admin';

export const appRouter = createBrowserRouter([
  {
    path: "/",
    element: <HomePage />,
  },
  {
    path: "/archive",
    // element: <ArchivePage />,
    element: <div>Archive</div>,
  },
  {
    path: "/admin",
    // element: <AdminPage />,
    element: <div>Admin</div>,
  },
]);
