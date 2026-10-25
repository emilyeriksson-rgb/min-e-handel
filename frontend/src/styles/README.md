# Styles

Ersätt hela frontend/src/styles med denna styles-mapp.
Befintliga CSS-importer i JavaScript och JSX fungerar fortfarande. Du behöver inte lägga till nya importer där.

## Filernas ansvar

- variables.css: färger, mått, skuggor och kompatibilitetsnamn.
- base.css: grundstilar, typografi, formulär, fokus och tillgänglighet. Importerar buttons.css.
- buttons.css: gemensam knappstorlek och primär knappstil.
- PublicLayout.css: samlar butikens delstilar via CSS-importer.
- public/layout.css: sidram och sidfot.
- public/header.css: sidhuvud, valuta och varukorg.
- public/hero.css: startsidans introduktion och logotyp.
- public/catalog.css: sökfält, produkttyper, kategorier, filter och sidbläddring.
- public/cards.css: kurskort och bokkort.
- public/course.css: kursdetaljer och kurstillfällen.
- public/checkout.css: varukorg, kassa och bokningsbekräftelse.
- public/responsive.css: butikens responsiva regler och systeminställningar.
- AdminLayout.css: administration, tabeller, formulär och bokdialog.
- Loader.css: laddningsindikatorn.
- OwlContact.css: kontaktbubblan och dess animationer.

## Gemensamma regler

Vanliga knappar får innehållsanpassad bredd i buttons.css. De tidigare fullbreddsreglerna för vanliga knappar har tagits bort.
Ikonknapparna vid varukorgen och kontaktbubblan behåller sina avsiktliga mått.
Sidornas befintliga knappfärger och varianter finns kvar i respektive komponentfil.
Ändra generella knappmått i buttons.css i stället för att lägga nya korrigeringar sist i andra filer.

Färger och tidigare variabelnamn har behållits för att befintliga komponenter ska fungera.
Varje deklaration står på en egen rad. Samma selektor har samlats där det gick utan att ändra dess avsedda beteende.
Återkommande selektorer i media queries är avsiktliga anpassningar till skärmstorlek.

## Kontroll

CSS-filerna är syntaxkontrollerade och produktionsbygget i den uppladdade appen passerar.
De befintliga sidreglerna har jämförts vid 375, 700, 768, 1101 och 1440 px för att kontrollera den omflyttade kaskaden.
Kontrollera även utseendet i din egen webbläsare efter bytet, särskilt Edit-dialogen, kategoriraden och mobilvyn.
