import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Manrope, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";

// Self-hosted by next/font (no render-blocking stylesheet, no layout shift).
// Manrope carries body/UI text; Plus Jakarta Sans is the display face for
// headings and the brand voice.
const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-manrope",
});

const display = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  weight: ["500", "600", "700", "800"],
  variable: "--font-display-jakarta",
});

export const metadata: Metadata = {
  title: "Knova – Learning Platform for you all.",
  description:
    "A telemetry-driven educational platform applying social media engagement mechanics to personalize learning content.",
  icons: {
    icon: "/logos/Knova.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable}`}
    >
      <head>
        {/* Material Symbols is an icon font, so it still comes from Google */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
