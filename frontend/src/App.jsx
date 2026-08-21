import { Routes, Route } from "react-router-dom";

import PublicLayout from "./layouts/PublicLayout.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";

import HomePage from "./pages/HomePage.jsx";
import CoursePage from "./pages/CoursePage.jsx";
import CartPage from "./pages/CartPage.jsx";
import CheckoutPage from "./pages/CheckoutPage.jsx";

import AdminHomePage from "./pages/admin/AdminHomePage.jsx";
import AdminCoursesPage from "./pages/admin/AdminCoursesPage.jsx";
import AdminCourseFormPage from "./pages/admin/AdminCourseFormPage.jsx";

function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route
          path="/"
          element={<HomePage />}
        />

        <Route
          path="/courses"
          element={<HomePage />}
        />

        <Route
          path="/courses/:id"
          element={<CoursePage />}
        />

        <Route
          path="/cart"
          element={<CartPage />}
        />

        <Route
          path="/checkout"
          element={<CheckoutPage />}
        />
      </Route>

      <Route
        path="/admin"
        element={<AdminLayout />}
      >
        <Route
          index
          element={<AdminHomePage />}
        />
        <Route
          path="courses"
          element={<AdminCoursesPage />}
        />
        <Route
          path="courses/new"
          element={<AdminCourseFormPage />}
        />
        <Route
          path="courses/:id/edit"
          element={<AdminCourseFormPage />}
        />
      </Route>
    </Routes>
  );
}

export default App;