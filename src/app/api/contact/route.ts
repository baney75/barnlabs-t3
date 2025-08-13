import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const data = await request.formData();
  const payload = new URLSearchParams();
  data.forEach((value, key) => {
    if (typeof value === "string") payload.append(key, value);
  });
  // Forward to Web3Forms
  const res = await fetch("https://api.web3forms.com/submit", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload,
  });
  return NextResponse.json(await res.json(), { status: res.status });
}


