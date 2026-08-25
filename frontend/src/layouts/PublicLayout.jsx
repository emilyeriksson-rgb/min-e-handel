import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";
import "../styles/PublicLayout.css";


function PublicLayout() {
  return (
    <>
    <div className="public-layout">

      <Header />

      <Outlet />
      </div>
    </>
  );
}

export default PublicLayout;