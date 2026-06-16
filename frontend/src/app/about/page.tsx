import styles from "@/components/StaticPage.module.css";

export default function AboutPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>About Us</h1>
      <div className={styles.content}>
        <h2>Our Mission</h2>
        <p>
          At BachelorsSpace, we believe that finding the right people to live with is just as important as finding the right place. Our mission is to eliminate the friction, uncertainty, and high costs of renting.
        </p>
        <h2>How It Started</h2>
        <p>
          Born out of the sheer frustration of finding good roommates in Ahmedabad and Rajkot, we decided to build a platform that leverages intelligent matchmaking to pair compatible individuals and curate premium properties.
        </p>
        <h2>Why Choose Us</h2>
        <p>
          We rely on data-driven lifestyle matching, strict KYC verifications, and a seamless, high-end user experience to guarantee peace of mind.
        </p>
      </div>
    </main>
  );
}
