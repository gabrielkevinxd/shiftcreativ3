import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Shift Creativ3 | Produção de Vídeo Profissional em Portugal",
  description: "Produção de vídeos profissionais, reels, motion graphics e identidade visual para empresas em Portugal. Aumenta o teu engajamento com vídeos que vendem.",
  keywords: "produção de vídeo portugal, vídeo marketing, reels empresas, motion graphics, vídeo publicitário portugal, agência vídeo",
  openGraph: {
    title: "Shift Creativ3 | Produção de Vídeo Profissional em Portugal",
    description: "Produção de vídeos profissionais, reels, motion graphics e identidade visual para empresas em Portugal. Aumenta o teu engajamento com vídeos que vendem.",
    url: "https://shiftcreativ3.com",
    siteName: "Shift Creativ3",
    images: [
      {
        url: "/logo.png",
      },
    ],
    locale: "pt_PT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Shift Creativ3 | Produção de Vídeo Profissional em Portugal",
    description: "Produção de vídeos profissionais, reels, motion graphics e identidade visual para empresas em Portugal.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-PT">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
