import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import { AuthProvider } from "@/lib/auth";
import Link from "next/link";
import { Truck, Shield, Headphones } from "lucide-react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yaxantu - Marketplace",
  description: "Achetez et vendez facilement en Afrique",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
        </AuthProvider>
        <footer className="border-t border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div>
                <Link href="/" className="flex items-center gap-2 text-lg font-bold text-blue-700">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </div>
                  Yaxantu
                </Link>
                <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                  La marketplace moderne qui connecte acheteurs et vendeurs à travers l&apos;Afrique.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Marketplace</h3>
                <ul className="mt-3 space-y-2">
                  <li><Link href="/" className="text-sm text-gray-600 hover:text-blue-700 transition-colors">Accueil</Link></li>
                  <li><Link href="/search" className="text-sm text-gray-600 hover:text-blue-700 transition-colors">Recherche</Link></li>
                  <li><Link href="/seller" className="text-sm text-gray-600 hover:text-blue-700 transition-colors">Vendre</Link></li>
                  <li><Link href="/favorites" className="text-sm text-gray-600 hover:text-blue-700 transition-colors">Favoris</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Support</h3>
                <ul className="mt-3 space-y-2">
                  <li><Link href="/help" className="text-sm text-gray-600 hover:text-blue-700 transition-colors">Centre d&apos;aide</Link></li>
                  <li><Link href="/contact" className="text-sm text-gray-600 hover:text-blue-700 transition-colors">Contact</Link></li>
                  <li><Link href="/terms" className="text-sm text-gray-600 hover:text-blue-700 transition-colors">Conditions</Link></li>
                  <li><Link href="/privacy" className="text-sm text-gray-600 hover:text-blue-700 transition-colors">Confidentialité</Link></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Contact</h3>
                <ul className="mt-3 space-y-2 text-sm text-gray-600">
                  <li>support@yaxantu.com</li>
                  <li>+237 6XX XXX XXX</li>
                  <li>Douala, Cameroun</li>
                </ul>
              </div>
            </div>
            <div className="mt-10 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-200 pt-6">
              <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Yaxantu. Tous droits réservés.</p>
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <Truck className="h-4 w-4" />
                <Shield className="h-4 w-4" />
                <Headphones className="h-4 w-4" />
              </div>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
