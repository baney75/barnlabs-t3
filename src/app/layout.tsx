import "~/styles/globals.css";

import { type Metadata } from "next";
// Using self-hosted fonts via @fontsource in globals.css

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "BarnLabs",
  description: "Unlock Deeper Understanding Through Immersive Learning",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
