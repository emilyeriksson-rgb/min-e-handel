import "dotenv/config";
import { configureSearchIndex } from "../integrations/searchAdapter.js";

try {
  await configureSearchIndex();
  console.log("Sökindexet är konfigurerat.");
} catch (error) {
  console.error("Kunde inte konfigurera sökindexet:", error.message);
  process.exitCode = 1;
}