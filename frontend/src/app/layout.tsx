import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import ThemeProvider from "@/components/layout/ThemeProvider";
import { ToastProvider } from "@/components/layout/Toast";
import CommandPalette from "@/components/layout/CommandPalette";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Portfolio Advisory System",
    template: "%s | PortfolioAdvisor",
  },
  description:
    "AI-Driven Investment Risk Profiling & Portfolio Advisory - Personalized risk scoring, portfolio allocation, Monte Carlo simulation, and financial planning.",
  keywords: [
    "portfolio advisor",
    "risk profiling",
    "investment",
    "financial planning",
    "Monte Carlo",
    "SHAP",
    "AI",
  ],
  manifest: "/manifest.json",
  openGraph: {
    title: "Portfolio Advisory System",
    description: "AI-Driven Investment Risk Profiling & Portfolio Advisory",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#2563eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1e293b" },
  ],
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
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var resolved = theme === 'dark' || (theme === 'system' || !theme) && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (resolved) document.documentElement.classList.add('dark');
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100">
        <ThemeProvider>
          <ToastProvider>
            <CommandPalette />
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
