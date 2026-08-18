import { Route, Routes } from "react-router-dom";
import Header from "./components/Header.jsx";
import HomePage from "./pages/HomePage.jsx";
import CoursePage from "./pages/CoursePage.jsx";

function App() {
  return (
    <>
      <Header />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses/:id" element={<CoursePage />} />
      </Routes>
    </>
  );
}

export default App;