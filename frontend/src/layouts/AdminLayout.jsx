import { Outlet } from "react-router-dom";
import AdminHeader from "../components/admin/AdminHeader.jsx";
import AdminSidebar from "../components/admin/AdminSidebar.jsx";

function AdminLayout() {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <AdminHeader />

      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;