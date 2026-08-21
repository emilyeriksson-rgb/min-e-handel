import { NavLink } from "react-router-dom";

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <h2>Administration</h2>

      <nav
        className="admin-nav"
        aria-label="Adminnavigation"
      >
        <NavLink to="/admin" end>
          Översikt
        </NavLink>

        <NavLink to="/admin/courses">
          Utbildningar
        </NavLink>

        <NavLink to="/admin/orders">
          Beställningar
        </NavLink>
      </nav>
    </aside>
  );
}

export default AdminSidebar;