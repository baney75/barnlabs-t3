# BarnLabs T3 Migration: AI Seed Plan (v2)

**Project:** BarnLabs Application V2
**Objective:** To build a full-stack application from the current directory to production, migrating from the `old_codebase` to the T3 Stack.
**Stack:** Next.js, Vercel, Neon (PostgreSQL/Prisma), UploadThing, NextAuth.js, Tailwind CSS, React Three Fiber, shadcn/ui.

---

## **Phase 1: Project Initialization & Environment Setup**

This phase prepares the new T3 project and configures all necessary services and environment variables.

### **1.1: Initialize T3 Stack**

- **Action:** Run `npx create-t3-app@latest` in the current directory.
- **Configuration:**
  - TypeScript: Yes
  - Tailwind CSS: Yes
  - tRPC: Yes
  - Authentication: NextAuth.js
  - ORM: Prisma
  - Database Provider: PostgreSQL
  - Next.js App Router: Yes
  - Linter/Formatter: ESLint/Prettier
  - Install Dependencies: Yes (`pnpm install`)
  - Import Alias: `~/`

### **1.2: Create GitHub Repository**

- **Action:** Create a new public GitHub repository and push the initial project.
- **Repository Name:** `barnlabs-t3`
- **Steps:**
  1. Create a new public repository on GitHub named **`barnlabs-t3`**.
  2. Connect the local project to the new remote repository and push the initial commit.

### **1.3: Configure Environment Variables**

- **Action:** Use the `vercel env` CLI commands to add all secrets from `/.secrets/secrets.md` to Vercel.
- **Secrets to Add:**
  - `DATABASE_URL` (from Neon)
  - `DATABASE_URL_UNPOOLED` (from Neon)
  - 'UPLOADTHING_TOKEN`
  - `RESEND_API_KEY`
  - `RESEND_FROM_EMAIL`
  - `WEB3FORMS_ACCESS_KEY` = "f73f7250-5451-499f-8e96-5669baece62c"
  - `AUTH_SECRET` (Generate a new secure secret)
  - `GOOGLE_CLIENT_ID` (Placeholder)
  - `GOOGLE_CLIENT_SECRET` (Placeholder)

### **1.4: Set Up UI Component Library**

- **Action:** Initialize `shadcn/ui` in the project. This will provide a set of reusable, accessible, and themeable components (Buttons, Cards, Forms, etc.) that we will use to build the interface.
- **Command:** `pnpm dlx shadcn-ui@latest init`

### **1.5: Configure Tailwind CSS (`tailwind.config.ts`)**

- **Action:** Integrate the specified fonts and the full color palette.
- **Fonts:**
  - Header Text: Milonga
  - Navigation & Body: Galdeano
- **Color Palette:**
  - Header: `bg-[#9a631c]`, `text-[#e7e9dc]`
  - Hero: `bg-[#183b4e]`, `text-[#e7e9dc]`
  - Goals Box: `bg-[#9a631c]`
  - Features: `bg-[#d3b587]`, card `bg-[#8c5a1a]`, text `text-[#ffffff]`, icon `text-[#af9772]`
  - Contact: `bg-[#c0a57c]`, form `bg-[#7f5218]`, text `text-[#d3ceba]`, input `text-[#e7e9dc]`, button `bg-[#d3b587]`
  - Divider: `bg-[#183b4e]`

### **1.6: Asset Management**

- **Action:** Ensure all assets from the `/public` directory (`favicon.ico`, `Globe.svg`, `Earth_Model.glb`, `Earth_Model.usdz`) are correctly placed in the new T3 project's `/public` folder.

---

## **Phase 2: Backend & Database Architecture**

This phase builds the data models and server-side logic.

### **2.1: Define Prisma Schema (`prisma/schema.prisma`)**

- **Action:** Create the database schema.
- **Models:**
  - `User`: Fields for `id`, `name`, `email`, `password` (optional), `role` (enum: `USER`, `ADMIN`), and relations for NextAuth.js (`Account`, `Session`).
  - `Model`: Fields for `id`, `title`, `description`, `ownerId` (relation to User), `glbStorageId`, `usdzStorageId` (optional), `createdAt`.
  - `Dashboard`: A model to hold the user's customizable dashboard content, including a `content` (JSON) field.
  - `DashboardAsset`: Fields for `id`, `ownerId`, `storageId`, `fileType`, `fileName`.

### **2.2: Implement tRPC Routers (`/server/api/routers/`)**

- **Action:** Build the API endpoints by translating logic from the `old_codebase`.
- **Routers:**
  - `modelRouter`: CRUD operations for 3D models.
  - `userRouter`: User profile management and dashboard content updates.
  - `adminRouter`: Protected procedures for all admin functions.
  - `uploadRouter`: UploadThing file routes (server) and client utilities for uploads.

### **2.3: Configure Authentication (`/server/auth.ts`)**

- **Action:** Set up NextAuth.js with a database-driven role system.
- **Providers:**
  - **Google:** For all users.
  - **Credentials:** For the email/password-based admin and manually created user accounts.
- **Workflow:** Implement password reset flow using Resend.

### **2.4: Seed Initial Admin User**

- **Action:** Create a script in `prisma/seed.ts` to create the initial admin account (`projectbarnlab@gmail.com`).

---

## **Phase 3: Frontend Implementation**

This phase focuses on building a fully responsive user interface using `shadcn/ui` components.

### **3.1: Build Public Homepage**

- **Action:** Create a fully responsive homepage with no overflowing text.
- **Header:** Use Milonga font for "BarnLabs" text, Galdeano for navigation.
- **Hero Section:** Two-column layout with `<h1>` headline **"Unlock Deeper Understanding Through Immersive Learning"** and the "Our Goals" box. Right column features an interactive `Earth_Model` viewer (from `/public`) using React Three Fiber.
- **Features Section:** Three-card layout with specified text and logos.
- **Contact Form:** Implement the form to submit to **Web3Forms** using the `WEB3FORMS_ACCESS_KEY`. **Do not save messages to the database.**

### **3.2: Build User Dashboard**

- **Action:** Create a protected, responsive route for logged-in users.
- **Onboarding:** Display a "Welcome [username]!" message and a pre-populated sample dashboard.
- **Editor:** Implement a card-based grid system with drag-and-drop. Build an advanced editor with live Markdown preview and secure HTML sanitization.
- **Cards:** Develop pre-built cards: `Model Viewer`, `Video Viewer` (YouTube/direct uploads), `PDF Viewer`, `Markdown Editor`.

### **3.3: Build Admin Panel**

- **Action:** Create a protected, responsive layout for `/admin` routes.
- **Navigation:** `Stats`, `User Editor`, `Resource Manager`, `Email`.
- **Pages:** Implement the UI for each admin section using `shadcn/ui` components like tables and forms.

### **3.4: Build Share Pages (`/s/[shareId]`)**

- **Action:** Create a public, responsive page for viewing shared content.
- **Features:** Include an interactive model viewer, creator branding, "Created with BarnLabs" footer, and a client-side QR code generator.

---

## **Phase 4: Core Functionality & Integrations**

This phase implements the complex workflows for file handling and immersive experiences.

### **4.1: UploadThing Integration**

- **Action:** Use UploadThing for storage and upload handling. Follow the [UploadThing docs](https://docs.uploadthing.com/) to configure server routes and client utilities.
- **Server:** Define file routes with validators (MIME/size), protected endpoints for authenticated users, and callbacks to persist metadata in Prisma (`Model`, `DashboardAsset`).
- **Limits:** Support up to **500 MB** per file and a **10 MB** chunk threshold.

### **4.2: 3D/AR/VR Pipeline**

- **Action:** Build the core immersive experience.
- **Web Viewer:** Use **React Three Fiber** for all 3D model displays.
- **USDZ Conversion:** Create a tRPC procedure to trigger a server-side conversion for `.glb` files under **25 MB**.
- **Mobile AR:** The "View in AR" button will launch Apple's **Quick Look** (`.usdz`) or Google's **Scene Viewer** (`.glb`).

---

## **Phase 5: Testing & Quality Assurance**

This phase ensures the application is robust and reliable.

### **5.1: Unit & Integration Tests**

- **Action:** Write tests for critical backend logic (tRPC procedures) and complex frontend components using Vitest.

### **5.2: End-to-End (E2E) Testing**

- **Action:** Set up Playwright or Cypress to test key user flows:
  - User signup and login.
  - File upload process.
  - Dashboard editing.
  - Admin user management.

### **5.3: Manual QA**

- **Action:** Perform manual testing on major browsers (Chrome, Firefox, Safari) and mobile devices (iOS, Android) to check for responsiveness and AR functionality.

---

## **Phase 6: Finalization & Deployment**

This is the final phase to bring the application to production.

### **6.1: Final Cleanup**

- **Action:** After migration is complete, delete the `old_codebase` directory.

### **6.2: Deployment to Vercel**

- **Action:** Connect the GitHub repository to Vercel.
- **Go Live:** Merge the final code into the `main` branch to trigger the production deployment.

### **6.3: Documentation Review**

- **Action:** Ensure `docs/instructions.md` is updated and `docs/seed.md` is deleted after used through.
