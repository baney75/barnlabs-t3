import { Resend } from "resend";
import { env } from "~/env";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export async function sendPasswordResetEmail(params: { to: string; token: string }) {
  if (!resend || !env.RESEND_FROM_EMAIL) return;
  const resetUrl = `${env.AUTH_URL ?? "http://localhost:3000"}/reset?token=${encodeURIComponent(params.token)}`;
  await resend.emails.send({
    from: env.RESEND_FROM_EMAIL,
    to: params.to,
    subject: "BarnLabs Password Reset",
    text: `Click the link to reset your password: ${resetUrl} (valid for 1 hour)`,
  });
}


