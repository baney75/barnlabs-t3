import { NextResponse, type NextRequest } from "next/server";
import { env } from "~/env";

export async function POST(request: NextRequest) {
  const data = await request.formData();
  const payload = new URLSearchParams();
  data.forEach((value, key) => {
    if (typeof value === "string") payload.append(key, value);
  });
  if (!payload.get("access_key")) {
    const key =
      env.WEB3FORMS_ACCESS_KEY ?? "f73f7250-5451-499f-8e96-5669baece62c";
    payload.append("access_key", key);
  }
  if (!payload.get("from_name"))
    payload.append("from_name", "BarnLabs Contact Form");
  if (!payload.get("subject"))
    payload.append("subject", "New Contact Submission");
  // Forward to Web3Forms
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
    // Disable Next's caching for POST
    cache: "no-store",
  });
  const success = res.ok;
  // Prefer redirect back to home with status indicator so the form doesn't dump JSON
  const redirectUrl = new URL("/", request.nextUrl);
  redirectUrl.searchParams.set("contact", success ? "success" : "error");
  return NextResponse.redirect(redirectUrl, { status: 303 });
}
