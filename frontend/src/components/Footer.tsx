"use client";

import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerContent}>
        <div className={styles.brandSection}>
          <div className={styles.brand}>BachelorsSpace.</div>
          <p className={styles.description}>
            The smartest way to discover roommates and rent premium properties.
            Powered by intelligent matchmaking.
          </p>
        </div>

        <div>
          <h4 className={styles.colTitle}>Product</h4>
          <div className={styles.links}>
            <Link href="/#features" className={styles.link}>Features</Link>
            <Link href="/#matchmaking" className={styles.link}>Matchmaking</Link>
            <Link href="/#locations" className={styles.link}>Locations</Link>
            <Link href="/pricing" className={styles.link}>Pricing</Link>
          </div>
        </div>

        <div>
          <h4 className={styles.colTitle}>Company</h4>
          <div className={styles.links}>
            <Link href="/about" className={styles.link}>About Us</Link>
            <Link href="/careers" className={styles.link}>Careers</Link>
            <Link href="/contact" className={styles.link}>Contact</Link>
            <Link href="/blog" className={styles.link}>Blog</Link>
          </div>
        </div>

        <div>
          <h4 className={styles.colTitle}>Stay Updated</h4>
          <p className={styles.newsletterDesc}>
            Join our newsletter for the latest updates on new properties and features.
          </p>
          <form className={styles.inputGroup} onSubmit={(e) => e.preventDefault()}>
            <input 
              type="email" 
              placeholder="Enter your email" 
              className={styles.input}
              required
            />
            <button type="submit" className={styles.submitBtn}>
              Subscribe
            </button>
          </form>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <div>&copy; {new Date().getFullYear()} BachelorsSpace. All rights reserved.</div>
        <div className={styles.legalLinks}>
          <Link href="/privacy" className={styles.legalLink}>Privacy Policy</Link>
          <Link href="/terms" className={styles.legalLink}>Terms of Service</Link>
        </div>
      </div>
    </footer>
  );
}
