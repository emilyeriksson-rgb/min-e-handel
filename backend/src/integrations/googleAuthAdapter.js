import "dotenv/config";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { z } from "zod";

// Googles publika nycklar kontrollerar ID-tokenens signatur.
const googleKeys = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
  { timeoutDuration: 5000 }
);

const TokenResponseSchema = z.object({
  id_token: z.string().min(1).max(20000),
});

const GoogleUserSchema = z.object({
  sub: z.string().min(1).max(255),
  email: z.email().max(254),
  email_verified: z.literal(true),
  name: z.string().trim().min(1).max(200),
  nonce: z.string().min(1),
});

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Google-inloggningen är inte konfigurerad.");
  }

  return { clientId, clientSecret, redirectUri };
}

// 1. Bygger adressen som kunden skickas till.
export function createGoogleLoginUrl({
  state,
  codeChallenge,
  nonce,
}) {
  const { clientId, redirectUri } = getConfig();

  const url = new URL(
    "https://accounts.google.com/o/oauth2/v2/auth"
  );

  url.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce,
  }).toString();

  return url.toString();
}

// 2. Byter Googles tillfälliga kod mot tokens på servern.
export async function exchangeCodeForTokens({
  code,
  codeVerifier,
}) {
  const { clientId, clientSecret, redirectUri } = getConfig();

  const response = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
        code_verifier: codeVerifier,
      }),
      signal: AbortSignal.timeout(5000),
    }
  );

  if (!response.ok) {
    throw new Error("Google-inloggningen kunde inte slutföras.");
  }

  const data = TokenResponseSchema.parse(await response.json());

  return data.id_token;
}

// 3. Kontrollerar ID-token och returnerar kunduppgifterna.
export async function verifyGoogleIdToken(
  idToken,
  expectedNonce
) {
  const { clientId } = getConfig();

  const { payload } = await jwtVerify(idToken, googleKeys, {
    algorithms: ["RS256"],
    issuer: [
      "https://accounts.google.com",
      "accounts.google.com",
    ],
    audience: clientId,
    requiredClaims: ["sub", "exp", "iat", "nonce"],
  });

  const user = GoogleUserSchema.parse(payload);

  if (!expectedNonce || user.nonce !== expectedNonce) {
    throw new Error("Google-inloggningen kunde inte verifieras.");
  }

  return {
    googleSub: user.sub,
    email: user.email,
    name: user.name,
  };
}