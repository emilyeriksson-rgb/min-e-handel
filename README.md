# Kursrum — integrationer och Labb 2

Webbshop för kurser och kurslitteratur. Frontend är React/Vite och backend är Express/PostgreSQL.

**Deployad shop:** lägg in din verifierade URL här före inlämning.

## Kom igång lokalt

Använd Node.js 24 LTS och npm. Databastjänsten hos Aiven måste vara igång.

1. Kör `npm ci` i `backend` och i `frontend`.
2. Kopiera respektive `.env.example` till `.env` och fyll i egna värden.
3. Skapa tabellerna med `backend/database/schema.sql` om databasen är ny. Kör inte hela schemat igen i en befintlig databas.
4. Starta backend med `npm run dev` i `backend`.
5. Starta frontend med `npm run dev` i `frontend`.

Frontend använder normalt `VITE_API_URL=http://localhost:3001/api`. Backend använder `DATABASE_URL` om den är angiven, annars de separata `DB_*`-variablerna. Dela inte riktiga nycklar, lösenord eller `.env` i Git.

### Konton och miljövariabler

- PostgreSQL/Aiven: `DATABASE_URL` eller de separata databasvariablerna i backendens `.env.example`.
- Produktleverantör: `SUPPLIER_API_URL` och `SUPPLIER_API_KEY`.
- Algolia: `ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_API_KEY`, `ALGOLIA_SEARCH_API_KEY`, `ALGOLIA_INDEX_NAME`.
- `ALGOLIA_ADMIN_API_KEY` innehåller skrivnyckeln från Algolia. Den behöver skriva/radera poster och ändra indexinställningar. `configureSearch.js` behöver även kunna läsa inställningarna. Söknyckeln behöver sökbehörighet för huvudindexet och båda prisreplikerna.
- Valutakurser: `CURRENCY_API_URL` och `CURRENCY_CACHE_SECONDS`.

Alla Algolia-anrop går via backend. Ingen Algolia-nyckel behöver ligga i en `VITE_*`-variabel.

### Första synkningen till Algolia

Importera CSV eller XML i admin under Course Literature. Kör därefter från `backend`:

```sh
node src/scripts/syncCourses.js
node src/scripts/configureSearch.js
```

Konfigurationen skapar prisreplikerna `<indexnamn>_price_asc` och `<indexnamn>_price_desc`. De hålls uppdaterade av Algolia när huvudindexets poster ändras. Skriv alltid till huvudindexet.

Kursernas `objectID` är `course-<id>`. Böckernas `objectID` är artikelnumret. Prisfilter och prisordning använder `searchPrice` i SEK, med kursens rabattpris när det är aktivt. Filterinställningar och ranking finns i `searchAdapter.js`.

## Sök-API

`GET /api/search` svarar med `products`, `totalHits`, `totalPages`, `page` och `pageSize`.

| Parameter | Värden |
| --- | --- |
| `q` | Fritext, högst 200 tecken |
| `type` | `all`, `course`, `book` |
| `category` | Kategorinamn |
| `sort` | `relevance`, `price_asc`, `price_desc` |
| `page` | Heltal från 1 |
| `pageSize` | Heltal 1–50 |
| `minPrice`, `maxPrice` | Frivilliga prisgränser i SEK, högst två decimaler |
| `learningFormat` | `online`, `onsite`, `hybrid` eller tomt |
| `studyPace` | `eget tempo`, `heltid`, `deltid` eller tomt |
| `city` | Ortnamn eller tomt |

Ogiltiga parametrar ger 400 med en förklaring. Felaktigt svar från Algolia eller ett sökfel ger 503. Adaptern validerar Algolias svar med Zod och returnerar bara shoppens produktformat.

Startsidan har två rader: produkttyp och kategorier. Kategorierna kommer från hela den valda produkttypen. Studieforms- och studietaktsräknare kommer från databaskatalogen och gäller inte enbart den aktuella textsökningen. Träffantal och sidor ovanför korten kommer från sök-API:et. Ny söktext, nytt filter eller ny sortering börjar på sida 1. Gamla anrop avbryts så att gamla svar inte skriver över nya.

## Admin och felhantering

- CSV/XML-import, bokredigering och bokradering ändrar databasen innan Algolia uppdateras.
- Kurser synkas när de skapas/ändras/tas bort. Avpublicerade kurser tas bort ur indexet.
- Skapade, ändrade eller borttagna kurstillfällen synkar kursens ortlista efter databasändringen.
- Om indexeringen misslyckas finns databasändringen kvar och admin får en varning. För en bokändring går det att spara igen; för en import går det att importera igen. För en kurs eller dess orter går det att spara kursen igen.
- Om radering sparas men Algolia misslyckas kan en inaktuell träff ligga kvar. Den kan tas bort i Algolias dashboard med exakt objectID efter att tjänsten återhämtat sig. Bekräfta först att produkten verkligen är borttagen i databasen.
- En ny leverantörsimport kan återskapa en raderad leverantörsbok och återställa manuella uppgifter.
- Redigering sker i en dialog. Under sparande/radering är relaterade åtgärder låsta. Radering kräver bekräftelse.

## Tester

Från `backend`: `npm test`. Testerna använder simulerad databas och Algolia och behöver inga riktiga nycklar. De kontrollerar API-validering, paginering, format, filter, global prisordning, bokändring/radering, indexeringsfel samt synkning efter kurstillfällesändringar. De bevisar inte att ditt riktiga Algolia-konto eller din deploy fungerar.

Från `frontend`: `npm run lint` och `npm run build`.

Sluttesta alltid själv mot den publicerade shoppen:

- Sök med ett stavfel och kontrollera rätt produkt.
- Sida 2 innehåller andra, korrekta produkter.
- Byt filter/sortering på sida 2: sidan återställs till 1.
- Priser är sorterade över sidgränsen, även med aktiva rabatter.
- `/api/search?page=0` och `/api/search?pageSize=1000` ger HTTP 400.
- Ändra och ta bort en bok i admin: sökresultatet ändras inom en minut.
- Skapa/avpublicera en testkurs och kontrollera sökningen.
- Lägg till/ändra/ta bort ett kurstillfälle och kontrollera ortsökningen.
- Vid sökfel visas ett begripligt meddelande.
- Vid indexeringsfel sparas databasändringen och varningen visas.
- Ingen skrivnyckel finns i webbläsarens källkod, nätverkssvar eller byggda frontendfiler.

## Deploy med den befintliga vercel-mappen

Projektet har en separat `vercel`-mapp. Att bara ändra `backend/src` uppdaterar inte dess gamla backendkopia.

Efter lokal kontroll, kör från repots rot:

```sh
node scripts/prepare-vercel.mjs
```

Skriptet bygger frontend med `VITE_API_URL=/api` och uppdaterar `vercel/public`, `vercel/backend`, paketfilerna och serverless-ingången från aktuell kod. Det publicerar inte. Granska sedan `git status` och deploya den uppdaterade `vercel`-mappen med din befintliga Vercel-konfiguration. Behåll projektets befintliga Vercel-koppling och använd en aktuell stödd Node-version.

Lägg backendens hemliga variabler i hostingplattformens miljövariabler. Kör Algolia-konfigurationen med samma applikation/index som deployen använder. Testa `/api/search`, `/api/catalog` och `/api/currency` på den publicerade domänen. Fyll i deploylänken högst upp och håll databas och shop igång under rättningen.

## Reflektionsunderlag för hittills byggda integrationer

Detta avsnitt beskriver den kod som finns nu. Läs igenom och anpassa med egna ord inför redovisningen. Reflektionen för hela inlämningen behöver kompletteras när betalning, molnlagring och frakt har implementerats.

Produktimporten kombinerar HTTP-anrop med filintegration. Leverantören erbjuder CSV och XML, och min adapter hämtar och tolkar dessa format innan uppgifterna används. CSV och XML passar en katalog där många produkter kan levereras tillsammans. Adaptern översätter leverantörens fältnamn till shoppens gemensamma format. Zod kontrollerar varje post. Felaktiga poster hoppas över och visas i importrapporten, medan godkända poster sparas med artikelnumret som unik identifierare.

Sökintegrationen använder Algolias JavaScript-SDK på servern. SDK:t sköter HTTP-kommunikationen, medan min adapter bestämmer index, nyckel, produktformat och felhantering. React anropar mitt eget REST-API i Express. Det gör att jag kan validera parametrar och byta leverantör utan att gränssnittet behöver känna till Algolias svar. Skrivnyckeln finns bara på servern. Sökningen använder en separat söknyckel även där, så att sökoperationen inte behöver skrivbehörighet.

Valutaintegrationen använder REST och cachar kurser en begränsad tid. Det passar uppgifter som används ofta men inte behöver hämtas på nytt för varje produktkort. Grundpriserna ligger i SEK; andra valutor används för visning. Prisgränser från reglaget räknas tillbaka till SEK före sökningen, så att samma databaspriser och samma Algolia-index kan användas oavsett visningsvaluta.

Fördelarna med externa tjänster skiljer sig åt. Leverantörsimporten minskar manuell registrering och risken för att kopiera fel priser eller lageruppgifter. Algolia ger stavfelstolerans, ranking och snabb sökning som annars skulle kräva egen implementation, indexering och löpande underhåll. Valutatjänsten ger kursdata som jag själv annars hade behövt samla in och hålla aktuell. Integrationerna sparar arbete, men förutsätter att deras data och tillgänglighet hanteras medvetet.

Databasen är shoppens källa för sparade produkter. Därför sparas produkten först i PostgreSQL och därefter i sökindexet. Om Algolia är nere ska admin inte få ett fel som påstår att hela databasändringen misslyckades. I stället returneras en separat varning om indexeringen. Sökresultatet kan då vara inaktuellt tills synkningen görs om. Om själva sökanropet misslyckas returnerar API:et 503 och gränssnittet visar ett begripligt fel. Felaktiga parametrar stoppas tidigare med 400.

Beroendet av Algolia innebär också risker. Ändrade kvoter, priser eller villkor kan påverka shoppens kostnad eller funktion. Standardreplikerna för prisordning lagrar kopior av indexets poster och måste därför räknas med i användningen. Endast offentliga produktuppgifter ska indexeras; kunduppgifter behövs inte för produktsökning. Adaptergränsen minskar kopplingen till leverantören, men ett byte skulle fortfarande kräva ny indexering, testning och anpassning av sökbeteendet.
