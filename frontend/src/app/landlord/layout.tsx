import NavbarLandlordMenu from "@/components/NavbarLandlordMenu";
import BrandLogo from "@/components/BrandLogo";
import styles from "./layout.module.css";

export default function LandlordLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <BrandLogo size="1.25rem" style={{ marginBottom: "0.6rem" }} />
          <div className={styles.sidebarLogo}>
            <span className={styles.logoIcon}>🏢</span>
            <span className={styles.logoText}>Landlord Portal</span>
          </div>
        </div>
        {/* NavbarLandlordMenu renders the full navigation for verified landlords */}
        <NavbarLandlordMenu mode="sidebar" />
      </aside>
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
