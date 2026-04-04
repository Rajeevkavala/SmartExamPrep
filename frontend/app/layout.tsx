import type { Metadata } from "next";
import { Inter } from "next/font/google";
import NextTopLoader from "nextjs-toploader";

import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SmartExamPrep",
  description: "AI-powered preparation platform for GATE CSE aspirants.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} dark h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-slate-950 text-slate-100 antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <NextTopLoader color="#4f46e5" showSpinner={false} />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
