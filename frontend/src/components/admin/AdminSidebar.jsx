import { NavLink } from "react-router-dom";

function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <h2>Menu</h2>

      <nav
        className="admin-nav"
        aria-label="Adminnavigation"
      >
        <NavLink to="/admin" end>
          Dashboard
        </NavLink>

        <NavLink to="/admin/courses">
         Manage Courses
        </NavLink>

        <NavLink to="/admin/orders">
          Manage Orders
        </NavLink>

        <NavLink to="/admin/books">
          Manage Books
        </NavLink>
      </nav>
    </aside>
  );
}

export default AdminSidebar;