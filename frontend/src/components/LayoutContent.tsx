'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import NavLinks from './NavLinks';
import MobileNav from './MobileNav';
import NotificationBell from './NotificationBell';
import NavbarAuth from './NavbarAuth';
import ThemeToggle from './ThemeToggle';
import Footer from './Footer';
import AuroraBackground from './aurora-background';

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

  // Clean, distraction-free, full-screen workspace routes (No global marketing header/footer)
  const isPortalRoute =
    pathname.startsWith('/landlord') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/onboarding') ||
    isAuthPage;

  if (isPortalRoute) {
    return (
      <>
        {!isAuthPage && (
          <AuroraBackground
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: -20,
              pointerEvents: "none",
            }}
            starCount={65}
          />
        )}
        {children}
      </>
    );
  }

  return (
    <>
      <AuroraBackground
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -20,
          pointerEvents: "none",
        }}
        starCount={65}
      />

      {/* Premium Public Liquid Glass Navbar */}
      <nav className="navbar">
        <Link href="/" className="nav-brand">
          BachelorsSpace.
        </Link>
        <div className="nav-links">
          <NavLinks />
          <NotificationBell />
          {/* Desktop-only account controls — replaced by the drawer on mobile */}
          <span className="nav-auth-cluster">
            <NavbarAuth />
            <ThemeToggle />
          </span>
          <MobileNav />
        </div>
      </nav>

      {children}

      <Footer />
    </>
  );
}
