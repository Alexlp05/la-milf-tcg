import type { Metadata, Viewport } from "next";
import "./globals.css";
import Providers from "@/components/providers/SessionProvider";

export const metadata: Metadata = {
  title: "La Milf TCG — Collecte tes potes en cartes",
  description:
    "Le jeu de cartes à collectionner ultime basé sur les private jokes de ta bande de potes. Ouvre des boosters, collectionne des cartes épiques, et deviens le GOAT.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f8f6f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
