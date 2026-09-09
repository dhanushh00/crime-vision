import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CrimeVision Cloud - Biometric Surveillance",
  description: "Intelligent Cloud-Based Criminal Identification System",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen flex flex-col`}>
        <header className="bg-gray-900 border-b border-gray-800 p-4 shadow-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Link href="/" className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-red-600 animate-pulse"></span>
              <h1 className="text-xl font-extrabold tracking-widest text-white">
                CRIME<span className="text-red-600">VISION</span>
              </h1>
            </Link>
            <nav className="flex items-center gap-6 text-sm font-medium">
              <Link href="/" className="hover:text-red-500 transition-colors">Live Scanner</Link>
              <Link href="/register" className="hover:text-red-500 transition-colors">Register Suspect</Link>
              <Link href="/suspects" className="hover:text-red-500 transition-colors">Suspect Database</Link>
              <Link href="/audit" className="hover:text-red-500 transition-colors">Audit Logs</Link>
            </nav>
          </div>
        </header>
        <main className="flex-grow max-w-6xl mx-auto w-full p-6">
          {children}
        </main>
      </body>
    </html>
  );
}