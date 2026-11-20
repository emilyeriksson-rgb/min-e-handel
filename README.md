# Kursrum

## Kom igång

**Deployad shop:** [Öppna Kursrum](https://fsu25d-systemutveckling-uppgift-1-d.vercel.app/) Kör lokalt Du behöver Node.js 24, npm och PostgreSQL. För en ny databas: kör backend/database/schema.sql och sedan filerna i backend/database/migrations/ i nummerordning.

Kopiera backend/.env.example till backend/.env. Fyll i databasanslutning och testinställningar för leverantören, Algolia, Stripe, Supabase Storage och PostNord. Supabase behöver en publik bildbucket. Nycklar ska aldrig committas.

Sätt även: PORT=3001 FRONTEND_URL=[http://localhost:5173](http://localhost:5173/)

Skapa frontend/.env: VITE_API_URL=[http://localhost:3001/api](http://localhost:3001/api)

Starta backend från projektroten: cd backend npm install node src/scripts/configureSearch.js node src/scripts/syncCourses.js npm run dev

Starta frontend i en annan terminal från projektroten: cd frontend npm install npm run dev

Öppna adressen som Vite visar. Anpassa FRONTEND_URL om adressen skiljer sig. Testa integrationerna Importera CSV/XML och ladda upp produktbilder via admin. Importen skickar böcker till Algolia. Testa frakt genom att lägga en bok i varukorgen och välja leverans.

För lokal betalning behövs Stripe CLI:

```powershell
stripe login
stripe listen --events "checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.async_payment_failed,checkout.session.expired" --forward-to http://localhost:3001/api/payments/webhook
```

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

## Labb 5 – AI och PostNord

Jag använde ChatGPT för att stegvis implementera frakt för kurslitteratur i Kursrum. Jag beskrev projektets stack och bad om exakta filer och funktioner att ändra, samtidigt som befintlig design, filtrering och sortering skulle behållas.

Min första prompt började: ”Hjälp mig steg för steg med Labb 5 i webbshoppen Kursrum. Labb 2–4 är klara.”

### Arbetsgång och AI:ns förslag

1. **Ombud:** AI:n föreslog en separat PostNord-adapter i Express som hämtar närmaste ombud med Service Points V5, `nearest/byaddress`. Svaret valideras med Zod och anropet har timeout och felhantering. Jag testade med min egen sandlådenyckel, utan att dela den i chatten.
2. **Leveranstid:** AI:ns första beskrivning byggde på en äldre guide. Jag hämtade därför OpenAPI-specifikationen för Transit Time Calculation V1 and V2, version 2.0.3, från PostNords portal och klistrade in den för jämförelse.
3. **Rättning mot dokumentationen:** Vi anpassade anropet till `/rest/transport/v2/transittime/addresstoaddress`, med `originPostalCode` och `destinationPostalCode`. Parametern `serviceGroup` från AI:ns första förslag togs bort eftersom den inte finns i V2-specifikationen. Valideringen anpassades till V2:s arrayformat, `service.basicServiceCode` och `estimatedTimeOfArrival`. Koden hanterar både datum och dagintervall och kontrollerar att en användbar leveransuppskattning faktiskt finns.
4. **Frakt och order:** AI:n hjälpte mig att lägga till serverberäknade fraktpriser, kontroll av valt ombud, lagring på ordern och en separat fraktrad i Stripe Checkout. React skickar produktidentifierare, antal och fraktval, aldrig priser.

### Kontroller

Jag testade ombud och leveranstid i PostNords sandlåda för både ombud och hemleverans. Ett manipulerat ombudsval avvisades. Jag testade även fraktprisernas gränsvärden och kontrollerade att en bok för 99 kr plus hemleverans för 99 kr gav totalt 198 kr i databasen och Stripe Checkout.

Dokumentation som användes vid kontrollen: [PostNord – Transit Time Calculation V1 and V2](https://atdeveloper.postnord.com/apis/details?systemName=transport-v2-transittime-calculation).

### Labb 6 – Kundinloggning med Google

Kunder kan logga in med Google via OAuth 2.0 och OpenID Connect. Backend hanterar kodutbytet och validerar Googles ID-token. Kunden identifieras med Googles `sub` och skapas vid första inloggningen. Konton slås inte ihop automatiskt utifrån e-postadress.

Shoppen använder en serversession med en httpOnly-cookie för att hålla kunden inloggad. Det gör att sessionen kan avslutas vid utloggning och att Googles tokens stannar på servern. Befintlig lösenordsinloggning finns kvar.

Inloggade kunder kan se sina egna beställningar under Mina sidor. Backend skyddar åtkomsten och kopplar beställningar till kunden. Avbruten eller misslyckad Google-inloggning visas med ett begripligt felmeddelande.

### Labb 7 – GitHub-inloggning och felrapportering

Admin kan logga in med GitHub. Åtkomsten begränsas till tillåtna GitHub-konton och backendens adminroutes är behörighetsskyddade.

På adminsidan kan admin rapportera fel med rubrik och beskrivning samt se öppna issues med länkar till GitHub. Backend skapar issues med shoppens egen token och anger vilken admin som rapporterat. Token lagras endast på servern.

## Så fungerar autentiseringen i Kursrum

### Från inloggningsknapp till konto

När en kund klickar på ”Logga in med Google”, eller en administratör väljer
GitHub, går webbläsaren först till min backend. Backend skapar ett
inloggningsförsök som gäller i tio minuter. Försöket sparas i PostgreSQL
och kopplas till webbläsaren med en tillfällig HttpOnly-cookie. Sedan skickas
användaren vidare till Google eller GitHub.

Jag använder både state och PKCE. När användaren kommer tillbaka kontrollerar
backend att state hör till försöket som startades i samma webbläsare. Det
skyddar mot att någon får en annan person att slutföra fel inloggning.
Försöket förbrukas när det används. Med PKCE skickar backend först en
SHA-256-hash av ett slumpvärde. När inloggningskoden sedan byts mot en token
måste backend visa upp det ursprungliga värdet. En uppsnappad kod räcker
därför inte för att slutföra kodutbytet.

Vid Google-inloggning kontrollerar backend ID-tokenens signatur, utfärdare,
mottagare och utgångstid. Dessutom måste tokenens nonce matcha det specifika
inloggningsförsöket. Kunden identifieras med Googles stabila användar-ID, sub.
Det gör att två konton inte automatiskt kopplas ihop bara för att de har samma
e-postadress.

Vid GitHub-inloggning använder backend en access-token för att hämta profilen
från GitHub. Användarnamnet måste finnas i ADMIN_GITHUB_LOGINS för att backend
ska skapa en administratörssession. Om listan är tom släpps ingen in via det
flödet.

### Vilka tokens används och hur länge?

| Token | Användning och livslängd |
|---|---|
| Googles ID-token | Backend använder den för att verifiera kundens identitet och kontrollerar utgångstiden i `exp`. Shoppen sparar den inte efter inloggningen. Den använder ingen refresh-token. |
| GitHub-användarens access-token | Backend använder den under callbacken för att läsa profilen och sparar den inte. GitHub styr hur länge token är giltig. Att callbacken är slut innebär inte i sig att token har spärrats hos GitHub. |
| Shoppens `GITHUB_ISSUES_TOKEN` | Backend använder en separat token för att läsa och skapa issues i shoppens repo. Den lagras som en miljövariabel på servern. Giltigheten styrs av inställningarna hos GitHub och token kan återkallas där. |
| Kursrums egen sessionstoken | Efter godkänd inloggning skapar backend en signerad JWT som gäller i en timme. Den ligger i cookien `kursrum_auth`, som är HttpOnly och använder Secure i produktion. Leverantörernas tokens skickas aldrig till React. |

### Varför jag kombinerar JWT med en serversession

När användaren öppnar en skyddad sida kontrollerar backend både JWT:n och
motsvarande rad i `auth_sessions`. Vid utloggning markeras sessionen som
spärrad i databasen och cookien tas bort. Om någon har kopierat en giltig
sessionscookie kan den användas fram till utgångstiden eller tills sessionen
spärras. En kopia slutar alltså också fungera efter utloggningen.

En lösning där varje API enbart kontrollerar en signerad JWT passar när flera
tjänster behöver verifiera samma token utan ett databasuppslag. Nackdelen är
att en redan utfärdad token då kan fortsätta fungera fram till sin utgångstid.
I Kursrum vill jag kunna avsluta åtkomsten direkt, särskilt för en
administratör. Därför accepterar jag ett databasuppslag per autentiserat anrop.

Om shoppens issue-token läcker behöver jag återkalla den hos GitHub och lägga
in en ny i backendens miljövariabler. Att logga ut en administratör spärrar
administratörens Kursrum-session, men issue-token tillhör shoppen och har en
egen livscykel.

## Labb 8 – Orderbekräftelse via e-post

När Stripe bekräftar betalningen sparar webhooken betalningen och slutför databastransaktionen. Därefter skickas orderbekräftelsen till fakturamottagarens e-postadress. Kunden får en svensk HTML- och textversion med ordernummer i ämnesraden samt kundnamn, produkter, antal, priser, frakt och totalsumma. Kundnamn och produkttitlar HTML-escapas i HTML-versionen.

Backend behöver miljövariablerna `RESEND_API_KEY` och `EMAIL_FROM`. Endast e-postadaptern använder Resends API-nyckel och URL. Anropet har fem sekunders timeout. Adaptern kontrollerar HTTP-status och validerar att Resend returnerar ett giltigt mejl-ID. Med testavsändaren `Kursrum <onboarding@resend.dev>` används Resend-kontots adress som mottagare.

Tabellen `order_confirmation_emails` har en rad per order. Utskicket reserveras med status `sending` innan mejlet byggs. Adaptern använder `order-confirmation/<orderId>` som Idempotency-Key. När Resend accepterar mejlet sparas `sent` och mejlets ID. Vid ett nekat utskick sparas `failed` och en felkod. Betalningen är redan sparad och webhooken kan svara 200. Poster med `failed` eller `sending` får inga automatiska återförsök.

### Genomförda tester

| **Test**                             | **Resultat**                                                                                                                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nytt testköp i den deployade shoppen | Order 33 betalades och orderbekräftelsen kom direkt till inkorgen.                                                                                                                                                      |
| Samma Stripe-händelse skickades igen | Vercel svarade 200 vid båda leveranserna. Kunden fick ett enda mejl för order 33.                                                                                                                                       |
| Ogiltig Resend-nyckel lokalt         | Stripe-händelsen spelades upp mot en obetald testorder i en separat lokal databas. Webhooken svarade 200, ordern blev `paid` och mejlposten fick `failed`. Samma felkod syntes i backendloggen och i `last_error_code`. |
