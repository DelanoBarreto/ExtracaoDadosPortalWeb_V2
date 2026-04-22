import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { ScraperDrawer } from "@/components/layout/ScraperDrawer";
import { Providers } from "@/providers/QueryProvider";

export const metadata: Metadata = {
  title: "Portalgov Admin | Elite V5",
  description: "Gestão Pública de Alta Performance — Painel Administrativo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <Providers>
          {/* Shell fluido — sem centralização com box-shadow */}
          <div className="app-shell">
            <Sidebar />
            <main className="main-content">
              <div className="page-container">
                {children}
              </div>
            </main>
          </div>
          <ScraperDrawer />
        </Providers>
      </body>
    </html>
  );
}
