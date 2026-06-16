import styles from "@/components/StaticPage.module.css";

export default function TermsPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Terms of Service</h1>
      <div className={styles.content}>
        <h2>Agreement to Terms</h2>
        <p>
          By accessing or using BachelorsSpace, you agree to be bound by these Terms of Service.
        </p>
        <h2>User Conduct</h2>
        <p>
          Users must provide accurate information during the KYC process. Fraudulent profiles or behavior will result in immediate termination of your account.
        </p>
        <h2>Payments and Token Amounts</h2>
        <p>
          Token amounts paid through our platform are securely held and processed via Razorpay. Refund policies depend on the individual property landlord's terms.
        </p>
      </div>
    </main>
  );
}
