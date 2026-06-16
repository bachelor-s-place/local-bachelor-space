import styles from "@/components/StaticPage.module.css";

export default function CareersPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Careers</h1>
      <div className={styles.content}>
        <h2>Join the Squad</h2>
        <p>
          We are a fast-growing startup looking for passionate individuals who want to reshape the co-living and real estate landscape in India.
        </p>
        <h2>Open Positions</h2>
        <p>Currently, we are looking for:</p>
        <ul>
          <li><strong>Full Stack Engineer:</strong> Experience in Next.js, Go, and building premium user interfaces.</li>
          <li><strong>Operations Manager:</strong> To handle landlord onboarding and KYC verifications in Ahmedabad.</li>
        </ul>
        <h2>How to Apply</h2>
        <p>
          Send your resume and a brief introduction to <strong>careers@bachelorsspace.com</strong>.
        </p>
      </div>
    </main>
  );
}
