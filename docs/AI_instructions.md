# AI Instructions for BarnLabs

These guidelines help AI coding tools contribute effectively to this repo.

## Goals

- Build and deploy a Next.js 15 app on Vercel.
- Provide immersive 3D model viewing with AR/VR options.
- Secure authentication via NextAuth and Prisma.
- Functional contact form via Web3Forms.

## Do/Don't

- Do: respect the existing file structure and TypeScript types.
- Do: keep secrets out of Git. Use environment variables only.
- Do: prefer small, focused edits with clear commit messages.
- Don't: introduce new frameworks for already-solved problems.
- Don't: break server/client component boundaries.

## Environment variables

Define these in Vercel (or `.env.local` for dev):

- DATABASE_URL, DATABASE_URL_UNPOOLED
- AUTH_SECRET
- GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
- RESEND_API_KEY, RESEND_FROM_EMAIL (optional)
- UPLOADTHING_TOKEN (optional)
- WEB3FORMS_ACCESS_KEY (for contact form)
- PUB_URL (e.g., barnlabs.net)
- AUTH_URL or NEXTAUTH_URL (one will be inferred if missing)

## Conventions

- Use `~/` aliases for imports.
- Client components: add "use client" and avoid server-only APIs.
- Prefer `@react-three/fiber` and `@react-three/drei` for 3D.

## Testing/Build

- Run `pnpm build` before pushing. Fix env validation errors.
- Keep Playwright tests minimal and non-flaky.

## Pages

- `src/app/trecf/page.tsx` showcases a featured model and AR/VR links.
- `public/vr360.html` provides a simple A-Frame VR viewer.

## Contact Form

- Posts to `/api/contact` which forwards to Web3Forms.
- Requires `WEB3FORMS_ACCESS_KEY`.

## Attribution

- Attribute 3D models clearly (e.g., 3DShipwrecks for Dean Richmond).
