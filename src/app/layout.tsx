import React from "react";
import type { Metadata } from "next";
import { Noto_Serif_Devanagari, Lora } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import { ThemeProvider } from "../contexts/ThemeProvider";

const notoDevanagari = Noto_Serif_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: "वेदिक ग्रंथालय - Vedic Library | Online E-Books Reader",
  description: "Read Vedic scriptures, spiritual texts, and sacred literature online. Upload Word documents and enjoy a beautiful reading experience with Sanskrit support.",
  keywords: "Vedic texts, Sanskrit, spiritual books, online reader, sacred literature, Hindu scriptures",
  authors: [{ name: "Vedic Library Team" }],
  creator: "Vedic Library",
  publisher: "Vedic Library",
  openGraph: {
    title: "वेदिक ग्रंथालय - Vedic Library",
    description: "Online reader for Vedic scriptures and spiritual texts",
    type: "website",
    locale: "en_US",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${notoDevanagari.variable} ${lora.variable}`}> 
      <body className="antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
