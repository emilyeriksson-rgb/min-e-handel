import { Routes, Route } from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

import HomePage from "./pages/HomePage.jsx";
import CoursePage from "./pages/CoursePage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";
import OrderConfirmationPage from "./pages/OrderConfirmationPage.jsx";

import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import AccountPage from "./pages/AccountPage.jsx";
import RequireAuth from "./components/RequireAuth.jsx";

import AdminHomePage from "./pages/admin/AdminHomePage.jsx";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage.jsx";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage.jsx";
import AdminBooksPage from "./pages/admin/AdminBooksPage.jsx";

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<HomePage />} />
        <Route path="/courses/:id" element={<CoursePage />} />

        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />

        <Route
          path="/order-confirmation"
          element={<OrderConfirmationPage />}
        />

        <Route path="/logga-in" element={<LoginPage />} />
        <Route path="/registrera" element={<RegisterPage />} />

        <Route
          path="/mitt-konto"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
      </Route>

      {/* Inloggningen ligger utanför den skyddade adminrouten. */}
      <Route
        path="/admin/login"
        element={<LoginPage admin />}
      />

      <Route
        path="/admin"
        element={
          <RequireAuth admin>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<AdminHomePage />} />
        <Route path="courses" element={<AdminCoursesPage />} />
        <Route path="orders" element={<AdminOrdersPage />} />
        <Route path="books" element={<AdminBooksPage />} />
      </Route>
    </Routes>
  );
}

export default App;