"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import BrandLogo from "@/components/BrandLogo";
import styles from "./layout.module.css";

const ADMIN_NAV = [
  { href: "/admin/verifications", icon: "🔍", label: "Verification Queue" },
  { href: "/admin/kyc", icon: "🛡️", label: "KYC Review" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // The login page lives inside /admin/ but must NOT be guarded —
  // otherwise redirecting to /admin/login applies this layout to it, causing an infinite spinner.
  const isLoginPage = pathname === "/admin/login";

  // Guard: only admins can access the console (skip for the login page itself)
  useEffect(() => {
    if (!isLoginPage && !loading && (!user || user.role !== "admin")) {
      router.replace("/admin/login");
    }
  }, [user, loading, router, isLoginPage]);

  // Render login page without the admin shell
  if (isLoginPage) return <>{children}</>;

  if (loading || !user || user.role !== "admin") {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {/* ── Top header bar ── */}
      <header className={styles.topbar}>
        <Link href="/admin/verifications" className={styles.topbarBrand}>
          <span className={styles.topbarBrandText}>BachelorsSpace.</span>
          <span className={styles.topbarBadge}>ADMIN</span>
        </Link>

        <div className={styles.topbarSpacer} />

        <div className={styles.topbarUser}>
          <span>{user.name}</span>
          <div className={styles.topbarAvatar}>{user.name?.charAt(0).toUpperCase()}</div>
          <button onClick={logout} className={styles.logoutBtn} title="Log out">↩</button>
        </div>
      </header>

      {/* ── Sidebar + main body ── */}
      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <BrandLogo size="1.2rem" style={{ marginBottom: "0.6rem" }} />
            <div className={styles.logo}>
              <span className={styles.logoBadge}>ADMIN</span>
              <span className={styles.logoText}>Console</span>
            </div>
          </div>

          <nav className={styles.nav}>
            {ADMIN_NAV.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`${styles.navLink} ${pathname === link.href ? styles.active : ""}`}
              >
                <span className={styles.navIcon}>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </nav>

          <div className={styles.sidebarFooter}>
            <div className={styles.adminInfo}>
              <div className={styles.adminAvatar}>
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <div className={styles.adminDetails}>
                <span className={styles.adminName}>{user.name}</span>
                <span className={styles.adminRole}>Administrator</span>
              </div>
            </div>
          </div>
        </aside>

        <main className={styles.mainContent}>
          {children}
        </main>
      </div>
    </div>
  );
}
