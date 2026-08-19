import { Route, Routes } from "react-router-dom";
import Header from "./components/Header.jsx";
import HomePage from "./pages/HomePage.jsx";
import CoursePage from "./pages/CoursePage.jsx";
import CartPage from "./pages/CartPage.jsx";

function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<HomePage />} />
        <Route path="/courses/:id" element={<CoursePage />} />
        <Route path="/cart" element={<CartPage />} />

      </Routes>
    </>
  );
}

export default App;