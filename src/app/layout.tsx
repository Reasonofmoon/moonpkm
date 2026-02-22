import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MoonPKM — Vim-based Knowledge Manager",
  description: "Obsidian을 넘는 Vim 기반 개인 지식관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body className={`${geistMono.variable} antialiased bg-[#282c34] text-[#abb2bf]`}>
        {children}
      </body>
    </html>
  );
}
