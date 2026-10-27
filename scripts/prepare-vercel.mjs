import {
  cp,
  mkdir,
  writeFile,
  readFile,
  readdir,
  rm,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stripTypeScriptTypes } from "node:module";
import path from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const target = path.join(root, "vercel");
const frontend = path.join(root, "frontend");
const backend = path.join(root, "backend");

// Konverterar endast kopian i vercel/backend.
async function prepareBackendJavaScript(directory) {
  const entries = await readdir(directory, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await prepareBackendJavaScript(file);
      continue;
    }

    if (entry.name.endsWith(".d.ts")) {
      await rm(file);
      continue;
    }

    if (!/\.(js|ts)$/.test(entry.name)) continue;

    let code = await readFile(file, "utf8");
    const isTypeScript = entry.name.endsWith(".ts");

    if (isTypeScript) {
      code = stripTypeScriptTypes(code, { mode: "strip" });
    }

    // Uppdatera relativa importsökvägar från .ts till .js.
    code = code.replace(
      /(["'])(\.{1,2}\/[^"']+)\.ts\1/g,
      "$1$2.js$1"
    );

    const output = isTypeScript
      ? file.slice(0, -3) + ".js"
      : file;

    if (
      isTypeScript &&
      entries.some(
        (other) =>
          other.name === entry.name.slice(0, -3) + ".js"
      )
    ) {
      throw new Error(
        `Både TS- och JS-källfiler finns för ${file}`
      );
    }

    await writeFile(output, code);

    if (isTypeScript) {
      await rm(file);
    }
  }
}

// Bygg frontend med samma API-adress som den publicerade shoppen.
execFileSync(
  process.execPath,
  [
    path.join(frontend, "node_modules/vite/bin/vite.js"),
    "build",
  ],
  {
    cwd: frontend,
    env: { ...process.env, VITE_API_URL: "/api" },
    stdio: "inherit",
  }
);

await mkdir(path.join(target, "src/api"), {
  recursive: true,
});

// Återskapa den genererade backendkopian.
await rm(path.join(target, "backend"), {
  recursive: true,
  force: true,
});

await cp(
  path.join(backend, "src"),
  path.join(target, "backend"),
  { recursive: true }
);

await prepareBackendJavaScript(
  path.join(target, "backend")
);

await cp(
  path.join(frontend, "dist"),
  path.join(target, "public"),
  { recursive: true }
);

for (const name of ["package.json", "package-lock.json"]) {
  await cp(
    path.join(backend, name),
    path.join(target, name)
  );
}

await writeFile(
  path.join(target, "src/api/index.js"),
  `import express from "express";
import cors from "cors";
import courseRoutes from "../../backend/routes/courseRoutes.js";
import courseSessionRoutes from "../../backend/routes/courseSessionRoutes.js";
import orderRoutes from "../../backend/routes/orderRoutes.js";
import locationRoutes from "../../backend/routes/locationRoutes.js";
import currencyRoutes from "../../backend/routes/currencyRoutes.js";
import bookRoutes from "../../backend/routes/bookRoutes.js";
import catalogRoutes from "../../backend/routes/catalogRoutes.js";
import searchRoutes from "../../backend/routes/searchRoutes.js";
import paymentRoutes from "../../backend/routes/paymentRoutes.js";
import productImageRoutes from "../../backend/routes/productImageRoutes.js";
import { stripeWebhook } from "../../backend/controllers/paymentController.js";
import errorHandler from "../../backend/middleware/errorHandler.js";

const app = express();

app.use(cors());

// Signaturkontrollen kräver rå request-body.
app.post(
  "/api/payments/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());
app.use("/api/payments", paymentRoutes);
app.use("/api/product-images", productImageRoutes);
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
`
);

await writeFile(
  path.join(target, "vercel.json"),
  JSON.stringify(
    {
      version: 2,
      builds: [
        {
          src: "src/api/index.js",
          use: "@vercel/node",
        },
        {
          src: "public/**",
          use: "@vercel/static",
        },
      ],
      routes: [
        {
          src: "/api/(.*)",
          dest: "src/api/index.js",
        },
        {
          src: "/(.*\\.(?:js|css|svg|png|jpg|jpeg|webp|ico|woff|woff2))",
          dest: "public/$1",
        },
        {
          src: "/(.*)",
          dest: "public/index.html",
        },
      ],
    },
    null,
    2
  ) + "\n"
);

console.log(
  "Deploy folder prepared: vercel. No deployment was started."
);