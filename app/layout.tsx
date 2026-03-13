import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "GrowViax - Crypto Trading Platform",
    template: "%s | GrowViax",
  },
  description: "Trade crypto with confidence on GrowViax. Real-time charts, UP/DOWN bidding, and secure wallet management.",
  keywords: ["crypto", "trading", "bitcoin", "ethereum", "blockchain", "USDT", "BSC"],
  openGraph: {
    title: "GrowViax - Crypto Trading Platform",
    description: "Trade crypto with confidence on GrowViax.",
    type: "website",
    siteName: "GrowViax",
  },
  twitter: {
    card: "summary_large_image",
    title: "GrowViax - Crypto Trading Platform",
    description: "Trade crypto with confidence on GrowViax.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-dark-bg text-text-primary`}>
        <div className="bg-orb bg-orb-green" />
        <div className="bg-orb bg-orb-cyan" />
        <div className="bg-orb bg-orb-purple" />
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: '#141432',
              color: '#f1f5f9',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#00ff88', secondary: '#0a0a1a' },
            },
            error: {
              iconTheme: { primary: '#ff3b5c', secondary: '#0a0a1a' },
            },
          }}
        />
      </body>
    </html>
  );
}
