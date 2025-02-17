import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { Providers } from "../components/Providers";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Finance App",
  description: "Analyze your financial data with AI"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
          <SpeedInsights />
          <Analytics />
          <Toaster />
        </Providers>
        <footer className="text-center text-sm text-muted-foreground">
          <p>
            Made with ❤️ by{" "}
            <a
              href="https://github.com/gagocarrilloedgar"
              className="underline"
            >
              Edgar Gago Carrillo
            </a>
          </p>
          <p>
            <a
              href="https://github.com/gagocarrilloedgar/finance-ai"
              className="underline"
            >
              View the source code
            </a>
          </p>
        </footer>
      </body>
    </html>
  );
}
