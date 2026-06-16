import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import NavbarAuth from "@/components/NavbarAuth";
import NavLinks from "@/components/NavLinks";
import NotificationBell from "@/components/NotificationBell";
import GoogleProvider from "@/components/GoogleProvider";
import Footer from "@/components/Footer";
import ThemeToggle from "@/components/ThemeToggle";
import LayoutContent from "@/components/LayoutContent";
import "./globals.css";


const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BachelorsSpace - Premium Co-living in Ahmedabad & Rajkot",
  description: "AI-driven matchmaking and spatial discovery for premium roommates.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        {/* Prevent flash of unstyled content — read saved theme before first paint */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('bs-theme');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t);}else{document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable}`}>
        <GoogleProvider>
          <AuthProvider>
            <div style={{ position: 'relative', minHeight: '100vh', isolation: 'isolate' }}>
              <LayoutContent>
                {children}
              </LayoutContent>
            </div>
          </AuthProvider>
        </GoogleProvider>
      </body>
    </html>
  );
}
