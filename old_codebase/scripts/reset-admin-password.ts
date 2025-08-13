// scripts/reset-admin-password.ts
// Node script to reset the admin password directly in D1 via Wrangler.
// Usage: npm run reset:admin

/* eslint-disable no-console */
import { execSync } from "node:child_process";
import readline from "node:readline";
import bcrypt from "bcryptjs";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) =>
    rl.question(question, (ans) => {
      rl.close();
      resolve(ans.trim());
    }),
  );
}

async function main() {
  console.log("BARN Labs Admin Password Reset\n");
  console.log("1) Reset LOCAL (wrangler d1 execute --local)");
  console.log("2) Reset REMOTE (wrangler d1 execute)");
  const choice = await prompt("Select an option (1/2): ");
  if (choice !== "1" && choice !== "2") {
    console.error("Invalid choice.");
    process.exit(1);
  }

  const username =
    (await prompt("Admin username (default: admin): ")) || "admin";
  const newPassword = await prompt("New password: ");
  if (!newPassword) {
    console.error("Password is required");
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  const sql = `UPDATE users SET password_hash='${hashedPassword.replace(/'/g, "''")}' WHERE username='${username.replace(/'/g, "''")}';`;

  const base = `wrangler d1 execute barnlabs-credentials`;
  const target = choice === "1" ? `${base} --local` : base;
  const cmd = `${target} --command "${sql}"`;

  console.log("\nExecuting:", cmd, "\n");
  try {
    const out = execSync(cmd, { stdio: "pipe" }).toString();
    console.log(out);
    console.log("\nDone. Try logging in now.");
  } catch (e) {
    console.error("Failed to execute:", (e as Error).message);
    process.exit(1);
  }
}

main();
