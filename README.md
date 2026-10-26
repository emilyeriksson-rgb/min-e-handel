# Kursrum

Webbshop för kurser och kurslitteratur. Frontend är React/Vite och backend är Express/PostgreSQL.

Deployad på fsu25d-systemutveckling-uppgift-1-d.vercel.app

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
