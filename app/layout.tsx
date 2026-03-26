import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Toaster } from "sonner";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "samba edvance",
    template: "%s | samba edvance",
  },
  description: "Plataforma de simulados, avaliações e gestão pedagógica para professores e coordenadores.",
  keywords: ["simulados", "avaliações", "gestão pedagógica", "BNCC", "escola", "professores"],
  authors: [{ name: "samba" }],
  creator: "samba",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "samba edvance",
    title: "samba edvance",
    description: "Plataforma de simulados, avaliações e gestão pedagógica para professores e coordenadores.",
  },
  twitter: {
    card: "summary",
    title: "samba edvance",
    description: "Plataforma de simulados, avaliações e gestão pedagógica para professores e coordenadores.",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="scroll-smooth" suppressHydrationWarning>
      <body className={`${outfit.className} antialiased overflow-x-hidden min-h-screen bg-background text-foreground transition-colors duration-300`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
