import type { Metadata, Viewport } from "next";
import NavbarWrapper from "@/components/NavbarWrapper";
import "./globals.css";
import ClientInterceptor from "./ClientInterceptor";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Family Finance App",
  description: "Quản lý dòng tiền gia đình, phân bổ ngân sách",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased min-h-screen font-sans flex flex-col">
        <ClientInterceptor />
        <NavbarWrapper />
        <main className="flex-1 pb-24 md:pb-0" style={{ paddingBottom: 'calc(5rem + env(safe-area-inset-bottom))' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
