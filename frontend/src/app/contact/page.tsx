import styles from "@/components/StaticPage.module.css";

export default function ContactPage() {
  return (
    <main className={styles.container}>
      <h1 className={styles.title}>Contact Us</h1>
      <div className={styles.content}>
        <h2>Get in Touch</h2>
        <p>
          Whether you have a question about our platform, need support with your squad, or want to list a property, our team is here to help.
        </p>
        <h2>Support</h2>
        <p>Email: support@bachelorsspace.com</p>
        <h2>Business Inquiries</h2>
        <p>Email: partnerships@bachelorsspace.com</p>
        <h2>Office Location</h2>
        <p>
          Ahmedabad, Gujarat, India
        </p>
      </div>
    </main>
  );
}
