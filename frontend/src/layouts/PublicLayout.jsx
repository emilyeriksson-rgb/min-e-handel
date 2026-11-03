import { Outlet } from "react-router-dom";
import Header from "../components/Header.jsx";
import "../styles/PublicLayout.css";
import CookieInfo from "../components/CookieInfo.jsx";
import CartNotice from "../components/CartNotice.jsx";


function PublicLayout() {
  return (
    <>
    <div className="public-layout">

      <Header />

      <Outlet />
      <CartNotice />
      <CookieInfo />
      </div>
    </>
  );
}

export default PublicLayout;