import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://lexkpi.app'),
  
  title: {
    default: "Lex KPI Dashboard",
    template: "%s | Lex KPI Dashboard",
  },
  description: "Internal performance tracking and analytics dashboard",
  applicationName: "Lex KPI Dashboard",
  
  // Block search engines - internal use only
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  
  // Icons
  icons: {
    icon: "/favicon.ico",
  },
  
  // Theme color for mobile browsers
  themeColor: "#1f2937",
  
  // Viewport settings
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}