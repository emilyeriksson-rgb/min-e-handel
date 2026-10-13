import { Link } from "react-router-dom";

function AdminHeader() {
  return (
    <header className="admin-header">
      <div className="admin-header-fc">
        <img src="/public/img/SVG/loga.svg" alt="Kursrum logo" className="logo" />
        <h3> Admin</h3>
      </div>

      <Link to="/">
        Visa webbplatsen
      </Link>
    </header>
  );
}

export default AdminHeader;