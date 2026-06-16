import styles from "@/components/StaticPage.module.css";

export default function PricingPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Pricing</h1>
      <div className={styles.content}>
        <h2>Simple, Transparent Pricing</h2>
        <p>
          BachelorsSpace is currently free to use for finding roommates and forming squads.
        </p>
        <h2>For Tenants</h2>
        <ul>
          <li>Free to browse properties and matches.</li>
          <li>Free to chat within your squad.</li>
          <li>Zero brokerage fees when booking properties directly through the platform.</li>
        </ul>
        <h2>For Landlords</h2>
        <ul>
          <li>Free to list properties.</li>
          <li>Premium placement features coming soon.</li>
        </ul>
      </div>
    </main>
  );
}
