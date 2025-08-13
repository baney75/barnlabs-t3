# BarnLabs Developer & AI Guidelines (v3.1)

This document provides the official guidelines for developing and maintaining the BarnLabs application. As a **T3 Stack** project, it adheres to specific conventions that are crucial for maintaining code quality, ensuring full-stack type-safety, and enabling smooth collaboration.

The core philosophy is **simplicity** and **modularity**. We use a curated set of powerful technologies to build scalable applications without being overly complex.

## **0. Project Setup & Installation (T3 Stack / pnpm)**

Before starting, ensure the project is correctly set up. These steps are mandatory to avoid common dependency, environment, and build errors.

1.  **Install pnpm**: If you don't have pnpm, install it globally first. It's the recommended package manager for T3 projects for its efficiency.

    ```powershell
    # Install pnpm using npm
    npm install -g pnpm
    ```

2.  **Clean and Install Dependencies**: Mismatched or outdated packages are the primary source of the current errors.

    ```powershell
    # It's recommended to remove old node_modules and the lock file first
    rm -r node_modules
    rm pnpm-lock.yaml

    # Now, perform a clean install with pnpm
    pnpm install
    ```

3.  **Configure Environment Variables**:
    - Copy the `.env.example` file to a new file named `.env.local`.
    - Populate `.env.local` with the necessary secrets from your team's password manager or the provided `/.secrets/secrets.md` file.
    - **Crucially**, ensure `NEXTAUTH_URL` matches your local development URL exactly (e.g., `NEXTAUTH_URL=http://localhost:3000`). If your terminal shows the app is running on a different port, you must update this value.

4.  **Generate Prisma Client**: After any dependency changes, you must regenerate the Prisma client to ensure your database queries are type-safe.

    ```powershell
    pnpm prisma generate
    ```

5.  **Seed the Database (Optional but Recommended)**: To populate your local database with initial data, run the seed script.
    ```powershell
    pnpm prisma db seed
    ```
6.  **Run the Development Server**: To start the Next.js application, run:
    ```powershell
    pnpm dev
    ```

## **1. Git Workflow**

(This section remains the same as standard Git practices apply.)

### **Branching**

- Never commit directly to the `main` branch.
- Create a new feature branch from `main` for every new task (e.g., `feat/add-contact-form`, `fix/header-overflow`).

### **Commit Messages**

- All commit messages must follow the **Conventional Commits** specification.
  **Format:** `<type>(<scope>): <short description>`

### **Pushing and Pull Requests (PRs)**

- Open a Pull Request to merge your feature branch into `main`. The PR description should clearly explain the _what_ and the _why_.
- All automated checks (linting, tests, Vercel preview build) must pass before a PR can be merged.

## **2. Vercel Usage & Environment Variables**

Vercel is our hosting and deployment platform.

### **Required Environment Variables**

- `DATABASE_URL` - Neon PostgreSQL connection string
- `UPLOADTHING_TOKEN` - UploadThing API token for file uploads
- `RESEND_API_KEY` - Resend service for password reset emails
- `RESEND_FROM_EMAIL` - From email address for notifications
- `WEB3FORMS_ACCESS_KEY` - Contact form submission service
- `AUTH_SECRET` - NextAuth.js session encryption secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `NEXTAUTH_URL` - Base URL for NextAuth (must match the running URL; e.g., http://localhost:3001 in dev when port is taken)
- `AUTH_URL` - Legacy/compat base URL for callbacks (keep aligned with NEXTAUTH_URL)
- `PUB_URL` - Public production URL (barnlabs.net)

### **Managing Secrets**

- **NEVER** commit secrets or environment variables (`.env.local`) to the Git repository.
- To add a new secret for deployment, use the Vercel CLI:
  ```bash
  # Add a secret to all environments (development, preview, production)
  pnpm vercel env add MY_API_KEY
  ```

## **3. Documentation Standards**

(This section remains the same.)

## **4. Key Implementation Details & Best Practices**

### **tRPC API Best Practices (IMPORTANT)**

The codebase has multiple `implicit any` errors. This happens when TypeScript can't infer the types for your procedure's context (`ctx`) or input (`input`). **Always explicitly type them to ensure full-stack type safety**, which is a core tenet of the T3 Stack.

**Correct (Explicit Types):**

```typescript
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { type AppRouter } from "~/server/api/root";
import { type inferRouterInputs, type inferRouterOutputs } from "@trpc/server";
import { z } from "zod";

// Define these types once per router file for easy inference
type RouterInput = inferRouterInputs<AppRouter>;
type RouterOutput = inferRouterOutputs<AppRouter>;

export const modelRouter = createTRPCRouter({
  /**
   * Fetches all models belonging to the currently authenticated user.
   */
  listMine: protectedProcedure.query(async ({ ctx }) => {
    // 'ctx.session.user' is now fully typed and safe to access.
    return ctx.db.model.findMany({
      where: { userId: ctx.session.user.id },
    });
  }),

  /**
   * Fetches a single model by its ID, ensuring it belongs to the user.
   * @param input - An object containing the model ID.
   */
  byId: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // 'input.id' is strongly typed via inference.
      return ctx.db.model.findFirst({
        where: { id: input.id, userId: ctx.session.user.id },
      });
    }),
});
```
