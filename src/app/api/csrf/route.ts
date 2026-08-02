import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

const CSRF_COOKIE_NAME = "csrf-token";
const CSRF_TOKEN_LENGTH = 32;

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
  }

  const response = new Response(JSON.stringify({ token }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

  response.headers.append(
    "Set-Cookie",
    `${CSRF_COOKIE_NAME}=${token}; Path=/; HttpOnly=${process.env.NODE_ENV === "production" ? "true" : "false"}; SameSite=Lax${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );

  return response;
}
