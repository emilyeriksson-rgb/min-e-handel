# Kursrum
## Kom igång
**Deployad shop:** [Öppna Kursrum](https://fsu25d-systemutveckling-uppgift-1-d.vercel.app)
Kör lokalt
Du behöver Node.js 24, npm och PostgreSQL. För en ny databas: kör backend/database/schema.sql och sedan filerna i backend/database/migrations/ i nummerordning.

Kopiera backend/.env.example till backend/.env. Fyll i databasanslutning och testinställningar för leverantören, Algolia, Stripe, Supabase Storage och PostNord. Supabase behöver en publik bildbucket. Nycklar ska aldrig committas.

Sätt även:
PORT=3001
FRONTEND_URL=http://localhost:5173

Skapa frontend/.env:
VITE_API_URL=http://localhost:3001/api

Starta backend från projektroten:
cd backend
npm install
node src/scripts/configureSearch.js
node src/scripts/syncCourses.js
npm run dev

Starta frontend i en annan terminal från projektroten:
cd frontend
npm install
npm run dev

Öppna adressen som Vite visar. Anpassa FRONTEND_URL om adressen skiljer sig.
Testa integrationerna
Importera CSV/XML och ladda upp produktbilder via admin. Importen skickar böcker till Algolia. Testa frakt genom att lägga en bok i varukorgen och välja leverans.

För lokal betalning behövs Stripe CLI:
stripe login
stripe listen --forward-to http://localhost:3001/api/payments/webhook

Spara lyssnarens signeringshemlighet som STRIPE_WEBHOOK_SECRET i backend/.env och starta om backend. Låt lyssnaren vara igång under testköpet. Använd endast Stripes testbetalningsuppgifter.

## Reflektion

I min webbshop Kursrum säljer jag kurser och kurslitteratur. Jag använder externa tjänster för produktimport, sökning, valutakurser, betalning, bildlagring och frakt. Varje tjänst har en egen adapter. Adaptern samlar tjänstens inställningar och omvandlar svaret till ett format som shoppen använder.

### Integrationsmodeller och varför de passar

Produktimporten använder HTTP för att hämta filer i CSV- och XML-format. Filer passar bra när många produkter ska hämtas samtidigt. Min adapter tolkar filerna och kontrollerar varje produkt med Zod. Felaktiga produkter hoppas över och visas i en rapport. Artikelnumret används för att uppdatera befintliga produkter utan att skapa dubbletter.

Sökningen använder Algolias JavaScript-SDK på servern. Ett SDK är ett kodbibliotek som förenklar kommunikationen med tjänsten. Algolia passar eftersom shoppen behöver fritextsökning, filter, sortering och paginering. React skickar sökningen till mitt REST-API i Express.

Valutatjänsten använder REST. Valutakurser sparas tillfälligt i en cache för att minska antalet anrop. Produkternas grundpriser är i SEK. Andra valutor används bara för visning.

Betalningen använder Stripes SDK, en redirect och en webhook. Kunden skickas vidare till Stripe Checkout för att betala. Stripe skickar sedan en webhook till min server. Servern kontrollerar signaturen för att säkerställa att meddelandet kommer från Stripe. Först därefter kan ordern markeras som betald. Bekräftelsesidan läser bara orderstatus.

Bildlagringen använder Supabases SDK i backend. Bilder laddas upp till Supabase Storage och produktens bildadress sparas i databasen. PostNord använder REST för att hämta ombud och beräknad leveranstid. Det passar eftersom informationen beror på kundens postnummer och val av leverans.

### Varför anropen går via Express

React anropar min egen Express-server. Servern sköter kommunikationen med de externa tjänsterna. Då behöver hemliga nycklar aldrig skickas till kundens webbläsare.

Servern kontrollerar också uppgifterna innan de används. Vid köp hämtas priser från databasen, och frakten räknas på servern. Kunden kan därför inte ändra betalningsbeloppet genom att skicka ett eget pris från webbläsaren. Valt ombud kontrolleras också mot PostNords svar.

### Varför jag använder externa tjänster

Produktimporten sparar tid och minskar manuell registrering. Utan den skulle jag behöva lägga in och uppdatera leverantörens produkter själv.

Algolia ger snabb sökning och stöd för stavfel. En egen lösning skulle kräva att jag bygger och underhåller sökindex, ranking och filter. Valutatjänsten ger aktuella kurser som jag annars skulle behöva samla in själv.

Stripe hanterar betalningssidan och betalningsflödet. Att bygga motsvarande funktion själv skulle kräva omfattande säkerhetsarbete och kontakt med betalningssystem. Supabase sköter lagring och leverans av bildfiler. En egen lösning skulle kräva lagringsutrymme, säkerhetskopiering och underhåll.

PostNord har information om ombud och transporter. Jag kan själv bestämma shoppens fraktpriser, men jag har inte egen information om deras leveransnät.

### Vad som händer vid fel

De externa anropen har timeout så att servern inte väntar hur länge som helst. Data från tjänsterna kontrolleras innan den används.

Om leverantören är nere misslyckas importen, men redan sparade produkter finns kvar. Om Algolia är nere får kunden ett felmeddelande vid sökning. Produktändringar sparas först i databasen. Om uppdateringen av sökindexet misslyckas får admin en varning och kan försöka igen.

Valutakurser återanvänds under en begränsad tid genom cache. Därefter behövs ett nytt anrop, som kan misslyckas om tjänsten är nere. Grundpriserna finns fortfarande i SEK.

Om Stripe inte kan skapa betalningssessionen får kunden ett felmeddelande och ordern är fortfarande obetald. Upprepade webhook-händelser ska inte ge dubbla lageravdrag.

Om Supabase inte kan ta emot en ny bild behålls den tidigare bilden. Om PostNord är nere visas ett fel. Köp av böcker stoppas om nödvändiga leveransuppgifter inte kan hämtas. Rena kursköp behöver ingen frakt.

### Risker med externa beroenden

Algolia kan ändra priser, kvoter eller villkor. Det kan påverka både kostnaden och sökningen. Jag skickar därför bara offentliga produktuppgifter till sökindexet. Kunduppgifter behövs inte där.

Jag behöver också tänka på personuppgifter när externa tjänster används. Supabases bildlagring är publik, så privata bilder ska inte laddas upp där.

Adaptrarna gör ett framtida byte av leverantör enklare, men ett byte kräver fortfarande anpassning och tester.
