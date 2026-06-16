import styles from "@/components/StaticPage.module.css";

export default function BlogPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Blog</h1>
      <div className={styles.content}>
        <h2>Latest Updates</h2>
        <p>
          Welcome to the BachelorsSpace blog! Here we share insights on co-living, real estate trends in Gujarat, and updates to our matchmaking algorithms.
        </p>
        <div style={{ marginTop: "2rem", padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "0.5px solid rgba(255,255,255,0.05)" }}>
          <h3 style={{ color: "#fff", marginBottom: "0.5rem" }}>The Science Behind Our Matchmaking</h3>
          <p style={{ fontSize: "0.85rem", marginBottom: "1rem" }}>Published: May 2026</p>
          <p>Learn how we use vector embeddings of your lifestyle choices to pair you with the perfect roommate...</p>
        </div>
      </div>
    </main>
  );
}
