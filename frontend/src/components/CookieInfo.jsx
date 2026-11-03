import "../styles/CookieInfo.css";

function CookieInfo() {
  return (
    <footer className="cookie-info">
      <details>
        <summary>Om cookies</summary>

        <p>
          Kursrum använder en nödvändig cookie för att hålla
          dig inloggad och ge dig tillgång till ditt konto.
          Den sätts när du loggar in.
        </p>

        <dl>
          <dt>Namn</dt>
          <dd>kursrum_auth</dd>

          <dt>Typ</dt>
          <dd>Nödvändig förstapartscookie från Kursrum.</dd>

          <dt>Innehåll</dt>
          <dd>
            Identifierare för ditt konto och din
            inloggningssession.
          </dd>

          <dt>Giltighet</dt>
          <dd>
            En timme per inloggning. Cookien tas bort
            när du loggar ut.
          </dd>
        </dl>

        <p>
          Du kan radera eller blockera cookies i
          webbläsarens inställningar. Om du blockerar
          inloggningscookien kan du inte vara inloggad.
        </p>
      </details>
    </footer>
  );
}

export default CookieInfo;