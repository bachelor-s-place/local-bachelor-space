import styles from "@/components/StaticPage.module.css";

export default function PrivacyPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Privacy Policy</h1>
      <div className={styles.content}>
        <h2>Data Protection</h2>
        <p>
          Your privacy is our priority. We employ bank-grade AES-256 encryption to secure your personal data and KYC documents.
        </p>
        <h2>Information We Collect</h2>
        <ul>
          <li>Profile details (name, email, lifestyle preferences).</li>
          <li>KYC verification data (Aadhaar, PAN).</li>
          <li>Usage data for improving our matchmaking algorithms.</li>
        </ul>
        <h2>How We Use Your Data</h2>
        <p>
          Data is exclusively used to provide our core service: finding you compatible roommates and properties. We never sell your personal information to third parties.
        </p>
      </div>
    </main>
  );
}
