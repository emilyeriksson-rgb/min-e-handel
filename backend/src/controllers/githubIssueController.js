import { z } from "zod";

import {
  createIssue,
  listOpenIssues,
} from "../integrations/githubAdapter.js";

const ReportIssueSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
}).strict();

const PageSchema = z.string()
  .regex(/^[1-9]\d{0,4}$/)
  .transform(Number)
  .pipe(z.number().int().min(1).max(10000));

function isTimeout(error) {
  return error.name === "TimeoutError" ||
    error.name === "AbortError";
}

// Hämtar en sida med öppna issues.
export async function getOpenIssues(req, res) {
  const parsed = PageSchema.safeParse(
    req.query.page ?? "1"
  );

  if (!parsed.success) {
    return res.status(400).json({
      message: "Ogiltigt sidnummer.",
    });
  }

  try {
    const result = await listOpenIssues(parsed.data);

    return res.json(result);
  } catch (error) {
    return res.status(isTimeout(error) ? 504 : 502).json({
      message: isTimeout(error)
        ? "GitHub svarade inte i tid. Försök hämta listan igen."
        : "Kunde inte hämta issues. Kontrollera shoppens GitHub-token, behörigheter och repo.",
    });
  }
}

// Skapar en issue med den inloggade adminen som rapportör.
export async function reportIssue(req, res) {
  const parsed = ReportIssueSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      message:
        "Ange en rubrik med 1–200 tecken och en beskrivning med 1–10000 tecken.",
    });
  }

  try {
    const issue = await createIssue({
      title: parsed.data.title,
      description: parsed.data.description,
      reportedBy: req.user.github_login,
    });

    return res.status(201).json({ issue });
  } catch (error) {
    return res.status(isTimeout(error) ? 504 : 502).json({
      message:
        "Rapporteringen kunde inte bekräftas. " +
        "Kontrollera listan på GitHub innan du skickar igen. " +
        "Om felet kvarstår, kontrollera shoppens GitHub-token, behörigheter och repo.",
    });
  }
}