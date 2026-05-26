import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const siteDescription =
  "Budgeting and net-worth tracking for individuals — and the couples they live with. Track your own accounts and choose what to share. Nothing is shared by default, everything is reversible.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Fincenzo", template: "%s · Fincenzo" },
  description: siteDescription,
  applicationName: "Fincenzo",
  authors: [{ name: "Xavier Gill", url: "https://github.com/xvrgill" }],
  keywords: [
    "budgeting",
    "net worth",
    "personal finance",
    "couples finance",
    "household budget",
    "Plaid",
    "money tracker",
  ],
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Fincenzo" },
  openGraph: {
    type: "website",
    siteName: "Fincenzo",
    title: "Fincenzo — mine, ours, one app",
    description: siteDescription,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fincenzo — mine, ours, one app",
    description: siteDescription,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
