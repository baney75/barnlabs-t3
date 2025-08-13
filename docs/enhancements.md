# BarnLabs Enhancements Plan (v3)

## 1. Primary Goals

- **Stabilize & Modernize**: Eliminate auth loops, upgrade all key dependencies to their latest stable versions, and enforce strict type-safety across the entire application.
- **Ship Reliable AR/VR**: Deliver a seamless 3D/AR/VR experience on iOS and Android with automatic device detection and clear fallbacks.
- **Refine User & Admin Workflows**: Improve the dashboard UX, asset management, and provide robust tools for admins and employees.
- **Achieve Production Readiness**: Implement comprehensive testing, observability, and performance optimizations.

## 2. Core Implementation Strategy

### Section A: Foundational Overhaul (Do First)

1.  **Standardize Package Management**:
    - **Action**: Standardize on `pnpm`.
    - **Task**: Delete `yarn.lock`, `package-lock.json`, and the `node_modules` directory. Run `pnpm import` to generate a `pnpm-lock.yaml` from the existing lockfile, then run `pnpm install` to ensure a clean slate.

2.  **Dependency & Tooling Upgrade**:
    - **Action**: Upgrade all key dependencies to their latest stable versions.
    - **Task**: Use `pnpm up --latest` for libraries like tRPC (v11+), Next.js (v14+), NextAuth (v5+), TanStack Query, Prisma, and Drizzle. Consult migration guides for any breaking changes.
    - **Task**: Replace deprecated methods (e.g., `fetchRequestHandler` with `createNextApiHandler` for tRPC).

3.  **Enforce Strict Type-Safety**:
    - **Action**: Eliminate all `implicit any` errors and enforce strict typing.
    - **Task**: Enable `strict: true` in `tsconfig.json`.
    - **Task**: Add explicit Zod-based `input` types and `ctx` types to every tRPC procedure.
    - **Task**: Correct any path aliases in `tsconfig.json` or `jsconfig.json` to resolve module path errors.

4.  **Implement Role-Based Access Control (RBAC)**:
    - **Action**: Convert the `role` field on the `User` model to a Prisma Enum for type-safety.
    - **Task**: In `prisma/schema.prisma`, define `enum Role { USER, EMPLOYEE, ADMIN }` and update the `User` model to use `role Role @default(USER)`.
    - **Task**: Run `pnpm prisma migrate dev` to apply the schema change.
    - **Task**: Create protected server-side helpers: `getRequiredSession()` and `getRequiredRole("ADMIN" | "EMPLOYEE")` for use in API routes and server components.

### Section B: Feature Development & Refinement

5.  **Authentication & Session Management**:
    - **Action**: Fix the auth redirect loop by separating server-side and client-side logic.
    - **Task**: Remove any server-side session bootstrap calls from the `/admin` layout (`layout.tsx`). Session checks must happen exclusively on the server using the new protected helpers.
    - **Task**: Move client-side UI logic (e.g., showing a loading spinner while session is determined) into a dedicated client component (`<ClientSessionProvider>`).
    - **Task**: Ensure `NEXTAUTH_URL` is required in the environment config and matches the deployment URL.

6.  **AR/VR & 3D Model Viewer**:
    - **Action**: Simplify the model viewer UI and implement robust device detection.
    - **Task**: The model viewer interface will only feature two buttons: "View in AR" and "View in VR".
    - **Task**: Implement logic to automatically detect the user's device and operating system to provide the correct experience (USDZ for iOS, Scene Viewer for Android).
    - **Task**: For the model viewer background, allow users and admins to select from a predefined list: `transparent`, `light`, `dark`, `studio`, and `outdoor`.
    - **Task**: Implement error boundaries and a user-friendly fallback UI (e.g., a static poster image) if a model fails to load.

7.  **Uploads & Asset Management**:
    - **Action**: Scope assets to users and grant admins universal access.
    - **Task**: In the UploadThing `onUploadComplete` callback (`src/app/api/uploadthing/core.ts`), save the authenticated `userId` to the database record for the uploaded file.
    - **Task**: When fetching files, ensure the logic allows users to access only their own files, while users with the `ADMIN` role can access all files.
    - **Task**: Implement chunked uploads with progress indicators using UploadThing's built-in features to handle files up to 300 MB.

8.  **Admin/Employee Tooling & Audit Log**:
    - **Action**: Create an audit log to track critical system events.
    - **Task**: Create a new `AuditLog` table in the Prisma schema with fields for `id`, `actorId`, `event`, `details`, and `createdAt`.
    - **Task**: Implement logging for the following initial events: `USER_ROLE_CHANGED`, `USER_PASSWORD_RESET`, `FILE_UPLOADED`, `FILE_DELETED`.

### Section C: Testing, CI/CD, and Production Readiness

9.  **Performance & Accessibility**:
    - **Action**: Identify and optimize heavy components.
    - **Task**: Analyze the application's bundle and identify any large, non-critical components or libraries that can be lazy-loaded with `next/dynamic`. Pay special attention to the 3D model viewer and any charting libraries.
    - **Task**: Run a Lighthouse/AXE accessibility audit and fix critical issues (headings, landmarks, focus styles, contrast).

10. **Observability**:
    - **Action**: Implement a simple, structured logging utility.
    - **Task**: Create a logging utility that outputs structured JSON to the console. Do not integrate a third-party service like Sentry yet.

11. **Testing & CI/CD**:
    - **Action**: Establish a CI pipeline and write the first critical E2E test.
    - **Task**: Create a `ci.yml` GitHub Actions workflow that runs `pnpm lint`, `pnpm typecheck`, and `pnpm test` on every push.
    - **Task**: Write the first Playwright E2E test for the following flow: **A user logs in, navigates to their dashboard, opens the dashboard editor, adds a model viewing card to the layout, saves, and confirms the model appears correctly.**
