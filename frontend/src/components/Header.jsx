import { Link } from "react-router-dom";

function Header() {
  return (
    <header>
    <Link to="/">Studie Centralen</Link>
    <p>I samarbete med Talivo</p>


      <nav aria-label="Huvudmeny">
        <Link to="/courses">Kurser</Link>
        <Link to="/cart">Varukorg</Link>
      </nav>
    </header>
  );
}

export default Header;