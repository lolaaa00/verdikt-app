import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Providers from "@/components/providers";
import ToastContainer from "@/components/ui/Toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "VERDIKT — You call it. The contract confirms it.",
  description:
    "Prediction markets powered by GenLayer Intelligent Contracts. No oracle. No admin. The contract reads the internet.",
  keywords: ["prediction market", "genlayer", "web3", "verdikt", "sports betting", "crypto"],
  openGraph: {
    title: "VERDIKT",
    description: "You call it. The contract confirms it.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VERDIKT",
    description: "You call it. The contract confirms it.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-bg text-white`}
        style={{ background: "#090909" }}
      >
        <Providers>
          <Navbar />
          <main className="min-h-screen">{children}</main>
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
