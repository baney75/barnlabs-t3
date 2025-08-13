import "~/styles/globals.css";

import { type Metadata } from "next";
import { Galdeano, Milonga } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "BarnLabs",
  description: "Unlock Deeper Understanding Through Immersive Learning",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const galdeano = Galdeano({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-galdeano",
});

const milonga = Milonga({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-milonga",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${galdeano.variable} ${milonga.variable}`}>
      <body>
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
