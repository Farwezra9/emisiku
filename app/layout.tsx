// Simpan sebagai: app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Font serif untuk judul, memberi karakter yang lebih hangat dan "organik"
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Emisiku - Carbon Emission Tracker",
  description:
    "Track and calculate your carbon emissions with Emisiku. Input your activities, view detailed reports, and take steps towards a greener future.",
  icons: {
    icon: "/emisiku.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans text-gray-800">
        {children}
      </body>
    </html>
  );
}