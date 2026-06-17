import type { Metadata, Viewport } from "next";
import { Fraunces, Libre_Franklin, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// serif display — headings / wordmark
const fraunces = Fraunces({
  variable: "--font-serif",
  subsets: ["latin"],
  display: "swap",
});

// clean sans — body
const libreFranklin = Libre_Franklin({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

// mono — all numbers / data
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "kerf",
  description: "the gap between supply and demand, mapped.",
};

// explicit so real phones use the device width (CDP emulation can mask a
// missing viewport meta — real devices cannot)
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${libreFranklin.variable} ${jetbrainsMono.variable} h-full scroll-smooth antialiased motion-reduce:scroll-auto`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
