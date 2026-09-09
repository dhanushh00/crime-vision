import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CrimeVision Cloud",
  description: "Intelligent Cloud-Based Criminal Identification",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen flex flex-col`}>
        <header className="bg-gray-900 border-b border-gray-800 p-4 shadow-md">
          <div className="max-w-5xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-widest text-white">CRIME<span className="text-red-600">VISION</span></h1>
            <nav className="flex gap-4">
              <Link href="/" className="hover:text-red-500 transition-colors">Live Scanner</Link>
              <Link href="/register" className="hover:text-red-500 transition-colors">Register Suspect</Link>
            </nav>
          </div>
        </header>
        <main className="flex-grow max-w-5xl mx-auto w-full p-6">
          {children}
        </main>
      </body>
    </html>
  );
}