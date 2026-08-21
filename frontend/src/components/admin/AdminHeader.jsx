import { Link } from "react-router-dom";

function AdminHeader() {
  return (
    <header className="admin-header">
      <div>
        <strong>Online Studier</strong>
        <span> Admin</span>
      </div>

      <Link to="/">
        Visa webbplatsen
      </Link>
    </header>
  );
}

export default AdminHeader;