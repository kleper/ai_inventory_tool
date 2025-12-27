import type { Metadata, Viewport } from "next";
import { Archivo_Black, Space_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { WebSocketProvider } from "@/components/providers/WebSocketProvider";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "sonner";

const archivo = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo"
});

const space = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space"
});

export const metadata: Metadata = {
  title: "SmartInventory",
  description: "AI-Powered Inventory Management",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartInventory",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${archivo.variable} ${space.variable} font-mono antialiased bg-white text-black`}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <WebSocketProvider>
              {children}
              <Toaster />
            </WebSocketProvider>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
