import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ConditionalLayout from "@/components/layout/ConditionalLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// SEO Metadata
export const metadata: Metadata = {
  title: {
    default: "Туры по Татарстану | Путешествия по республике с гидом",
    template: "%s | Туры по Татарстану",
  },
  description:
    "Откройте для себя Татарстан! Экскурсионные туры по Казани, Свияжску, Болгару и другим достопримечательностям. Профессиональные гиды, интерактивные карты, удобное бронирование.",
  keywords: [
    "туры по Татарстану",
    "экскурсии Казань",
    "туры Татарстан",
    "Свияжск",
    "Болгар",
    "достопримечательности Татарстана",
    "путешествие Татарстан",
  ],
  authors: [{ name: "Туры по Татарстану" }],
  creator: "Туры по Татарстану",
  publisher: "Туры по Татарстану",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: "/",
    title: "Туры по Татарстану | Путешествия по республике с гидом",
    description:
      "Откройте для себя Татарстан! Экскурсионные туры по Казани, Свияжску, Болгару и другим достопримечательностям.",
    siteName: "Туры по Татарстану",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Туры по Татарстану",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Туры по Татарстану | Путешествия по республике с гидом",
    description:
      "Откройте для себя Татарстан! Экскурсионные туры по Казани, Свияжску, Болгару.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.svg",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConditionalLayout>
          {children}
        </ConditionalLayout>
      </body>
    </html>
  );
}
