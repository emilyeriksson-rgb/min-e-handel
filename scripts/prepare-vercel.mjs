import { cp, mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const target = path.join(root, "vercel");
const frontend = path.join(root, "frontend");
const backend = path.join(root, "backend");

// Execute Node directly so this also works on Windows without shell quoting.
execFileSync(process.execPath, [path.join(frontend, "node_modules/vite/bin/vite.js"), "build"], {
  cwd: frontend,
  env: { ...process.env, VITE_API_URL: "/api" },
  stdio: "inherit",
});
await mkdir(path.join(target, "src/api"), { recursive: true });
await cp(path.join(backend, "src"), path.join(target, "backend"), { recursive: true });
await cp(path.join(frontend, "dist"), path.join(target, "public"), { recursive: true });
for (const name of ["package.json", "package-lock.json"]) {
  await cp(path.join(backend, name), path.join(target, name));
}
await writeFile(path.join(target, "src/api/index.js"), `import express from "express";
import cors from "cors";
import courseRoutes from "../../backend/routes/courseRoutes.js";
import courseSessionRoutes from "../../backend/routes/courseSessionRoutes.js";
import orderRoutes from "../../backend/routes/orderRoutes.js";
import locationRoutes from "../../backend/routes/locationRoutes.js";
import currencyRoutes from "../../backend/routes/currencyRoutes.js";
import bookRoutes from "../../backend/routes/bookRoutes.js";
import catalogRoutes from "../../backend/routes/catalogRoutes.js";
import searchRoutes from "../../backend/routes/searchRoutes.js";
import errorHandler from "../../backend/middleware/errorHandler.js";
const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/courses", courseRoutes);
app.use("/api/course-sessions", courseSessionRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/currency", currencyRoutes);
app.use("/api/books", bookRoutes);
app.use("/api/catalog", catalogRoutes);
app.use("/api/search", searchRoutes);
app.use(errorHandler);
export default app;
`);
await writeFile(path.join(target, "vercel.json"), JSON.stringify({
  version: 2,
  builds: [
    { src: "src/api/index.js", use: "@vercel/node" },
    { src: "public/**", use: "@vercel/static" },
  ],
  routes: [
    { src: "/api/(.*)", dest: "src/api/index.js" },
    { src: "/(.*\\.(?:js|css|svg|png|jpg|jpeg|webp|ico|woff|woff2))", dest: "public/$1" },
    { src: "/(.*)", dest: "public/index.html" },
  ],
}, null, 2) + "\n");
console.log("Deploy folder prepared: vercel. No deployment was started.");
