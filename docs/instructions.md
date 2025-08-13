# BarnLabs Developer & AI Guidelines

This document provides the official guidelines for developing and maintaining the BarnLabs application. Adhering to these standards is crucial for maintaining code quality, ensuring smooth collaboration, and enabling future AI agents to effectively contribute to the project.

## **1. Git Workflow**

A clean Git history is essential. Follow these rules for all contributions.

### **Branching**

- Never commit directly to the `main` branch.
- Create a new feature branch from `main` for every new task (e.g., `feat/add-contact-form`, `fix/header-overflow`).
- Use a logical, kebab-case naming convention: `<type>/<short-description>`.
  - **`feat`**: For new features.
  - **`fix`**: For bug fixes.
  - **`refactor`**: For code improvements that don't change functionality.
  - **`docs`**: For documentation changes.

### **Commit Messages**

All commit messages must follow the **Conventional Commits** specification. This makes the history readable and enables automatic versioning.

**Format:** `<type>(<scope>): <short description>`

- **`<type>`**: Must be one of `feat`, `fix`, `refactor`, `docs`, `style`, `test`, `chore`.
- **`<scope>`** (optional): The part of the codebase affected (e.g., `auth`, `dashboard`, `admin`).
- **`<short description>`**: A concise, imperative-mood summary (e.g., "add user deletion button," not "added a button").

**Examples:**

- `feat(auth): implement google oauth provider`
- `fix(dashboard): prevent text overflow on mobile cards`
- `docs(readme): update setup instructions`
- `refactor(api): simplify model query logic`

### **Pushing and Pull Requests (PRs)**

- Push your feature branch to the remote repository regularly.
- When your feature is complete and tested, open a Pull Request to merge your branch into `main`.
- The PR description should clearly explain _what_ the change is and _why_ it was made. Reference any relevant issue numbers.
- All automated checks (linting, tests, Vercel preview build) must pass before a PR can be merged.

## **2. Vercel Usage**

Vercel is our hosting and deployment platform. All interactions should be done through the Git workflow or the Vercel CLI.

### **Environment Variables**

- **NEVER** commit secrets or environment variables to the Git repository. Refer to the local `/.secrets/secrets.md` file for key values.
- To add a new secret, use the Vercel CLI:

  ```bash
  # Add a secret to all environments (development, preview, production)
  vercel env add MY_API_KEY

  # Add a secret ONLY to production
  vercel env add MY_API_KEY production
  ```

- To list existing variables, use `vercel env ls`.

### **Deployments**

- **Production:** Deployments to production happen automatically when a PR is merged into the `main` branch.
- **Previews:** Every push to a feature branch automatically generates a unique preview deployment. Use these preview URLs for testing and review.

## **3. Documentation Standards**

Good documentation is a feature. It is a requirement for both human developers and future AI agents who will work on this codebase.

### **Code Comments**

- Use comments to explain the **"why,"** not the "what." The code itself should clearly explain what it does. Comments should explain the reasoning behind a complex decision or a non-obvious implementation.
- Use JSDoc syntax for all tRPC procedures, complex functions, and React components to describe their purpose, parameters, and return values.

**Example:**

```typescript
/**
 * Generates a pre-signed URL for uploading an asset to Cloudflare R2.
 * This procedure is rate-limited to prevent abuse.
 * @param input - An object containing the desired filename and content type.
 * @returns A secure URL for the client to upload the file to directly.
 */
export const generateUploadUrl = protectedProcedure
  .input(z.object({ fileName: z.string(), contentType: z.string() }))
  .mutation(async ({ ctx, input }) => {
    // ...implementation
  });
```

### **Architectural Documentation**

- When a significant new feature or system is added (e.g., a new third-party integration, a complex data flow), a new Markdown file must be added to the `/docs` directory.
- This document should explain the high-level architecture, the decisions made, and any potential trade-offs. It should be written for a future developer (human or AI) who has no prior context.

This document serves as the single source of truth for development practices. It should be updated as our tools and processes evolve.
