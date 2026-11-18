import "dotenv/config";
import { z } from "zod";

const TokenSchema = z.object({
  access_token: z.string().min(1).max(4096),
  token_type: z.literal("bearer"),
  scope: z.string(),
});

const GitHubUserSchema = z.object({
  id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  login: z.string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9-]+$/),
  name: z.string().trim().max(200).nullable(),
});

function getConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID?.trim();
  const clientSecret = process.env.GITHUB_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GITHUB_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GitHub-inloggningen är inte konfigurerad.");
  }

  return { clientId, clientSecret, redirectUri };
}

// Gemensam funktion för anrop med timeout.
async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: "error",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error("GitHub kunde inte behandla anropet.");
  }

  return response.json();
}

// Bygger adressen till GitHubs inloggning.
export function createGitHubLoginUrl({
  state,
  codeChallenge,
}) {
  const { clientId, redirectUri } = getConfig();

  const url = new URL(
    "https://github.com/login/oauth/authorize"
  );

  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "read:user",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  }).toString();

  return url.toString();
}

// Byter den tillfälliga koden mot en access-token.
export async function exchangeGitHubCodeForToken({
  code,
  codeVerifier,
}) {
  const { clientId, clientSecret, redirectUri } = getConfig();

  const data = await requestJson(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }),
    }
  );

  const token = TokenSchema.parse(data);
  const scopes = token.scope.split(/[,\s]+/);

  if (!scopes.includes("read:user")) {
    throw new Error("Nödvändig profilbehörighet saknas.");
  }

  return token.access_token;
}

// Hämtar och validerar den inloggade GitHub-användaren.
export async function getGitHubUser(accessToken) {
  const data = await requestJson(
    "https://api.github.com/user",
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "Kursrum",
        "X-GitHub-Api-Version": "2026-03-10",
      },
    }
  );

  const user = GitHubUserSchema.parse(data);

  return {
    githubId: String(user.id),
    login: user.login,
    name: user.name || user.login,
  };
}

const IssuesConfigSchema = z.object({
  token: z.string().trim().min(1).max(4096),
  owner: z.string().trim().regex(/^[a-zA-Z0-9-]+$/),
  repo: z.string().trim()
    .regex(/^[a-zA-Z0-9_.-]+$/)
    .refine((value) => value !== "." && value !== ".."),
});

const CreateIssueSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(10000),
  reportedBy: z.string()
    .min(1)
    .max(39)
    .regex(/^[a-zA-Z0-9-]+$/),
}).strict();

const IssueSchema = z.object({
  number: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  title: z.string().min(1).max(1000),
  html_url: z.url().refine((value) => {
    const url = new URL(value);

    return url.protocol === "https:" &&
      url.hostname === "github.com" &&
      !url.username &&
      !url.password &&
      !url.port;
  }),
  state: z.enum(["open", "closed"]),
  pull_request: z.object({}).optional(),
});

function getIssuesConfig() {
  const parsed = IssuesConfigSchema.safeParse({
    token: process.env.GITHUB_ISSUES_TOKEN,
    owner: process.env.GITHUB_REPO_OWNER,
    repo: process.env.GITHUB_REPO_NAME,
  });

  if (!parsed.success) {
    throw new Error("Shoppens GitHub-inställningar saknas eller är ogiltiga.");
  }

  return parsed.data;
}

function issueHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "Kursrum",
    "X-GitHub-Api-Version": "2026-03-10",
  };
}

function publicIssue(issue) {
  return {
    number: issue.number,
    title: issue.title,
    url: issue.html_url,
    state: issue.state,
  };
}

// Dokumentation:
// https://docs.github.com/en/rest/issues/issues#create-an-issue
export async function createIssue(input) {
  const { title, description, reportedBy } =
    CreateIssueSchema.parse(input);

  const { token, owner, repo } = getIssuesConfig();

  const url =
    `https://api.github.com/repos/` +
    `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`;

  const data = await requestJson(url, {
    method: "POST",
    headers: issueHeaders(token),
    body: JSON.stringify({
      title,
      body:
        `Rapporterad av GitHub-admin: @${reportedBy}\n\n` +
        `---\n\n${description}`,
    }),
  });

  const issue = IssueSchema.parse(data);

  return publicIssue(issue);
}

// Dokumentation:
// https://docs.github.com/en/rest/issues/issues#list-repository-issues
export async function listOpenIssues(page = 1) {
  const validPage = z.number()
    .int()
    .min(1)
    .max(10000)
    .parse(page);

  const { token, owner, repo } = getIssuesConfig();

  const url = new URL(
    `https://api.github.com/repos/` +
    `${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/issues`
  );

  url.search = new URLSearchParams({
    state: "open",
    sort: "created",
    direction: "desc",
    per_page: "100",
    page: String(validPage),
  }).toString();

  const data = await requestJson(url, {
    headers: issueHeaders(token),
  });

  const entries = z.array(IssueSchema).max(100).parse(data);

  return {
    issues: entries
      .filter((entry) => !entry.pull_request)
      .map(publicIssue),
    page: validPage,
    hasMore: entries.length === 100,
  };
}