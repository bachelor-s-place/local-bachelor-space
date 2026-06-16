"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import styles from "./page.module.css";
import { Sparkles, Compass, ShieldCheck, CreditCard, MessageSquare, Home as HomeIcon, Settings } from "lucide-react";

export default function Home() {
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    target.style.setProperty("--mouse-x", `${x}px`);
    target.style.setProperty("--mouse-y", `${y}px`);
  };

  return (
    <main className={styles.container}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.badge}>
          ✦ Live now in Ahmedabad & Rajkot
        </div>

        <h1 className={styles.title}>
          Find Your Squad. <br />
          Find Your Space.
        </h1>

        <p className={styles.subtitle}>
          The smartest way to discover roommates and rent premium properties.
          Powered by intelligent personality matchmaking and precise spatial discovery.
        </p>

        <div className={styles.ctaGroup}>
          <Link href="/onboarding">
            <button className="btn-primary">Find a Roommate</button>
          </Link>
          <button className="btn-secondary">Explore Properties</button>
        </div>
      </section>

      {/* Elegant VisionOS/Monterey Dashboard Graphic with Real UI Mockup */}
      <div className={styles.dashboardPreview}>
        <div className={styles.dashboardHeader}>
          <div className={styles.windowControl}>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
            <div className={styles.dot}></div>
          </div>
          <div className={styles.headerTitle}>Matchmaking Dashboard</div>
          <div style={{ width: 44 }}></div> {/* spacer for centering */}
        </div>
        <div style={{ display: 'flex', flex: 1 }}>
          {/* Sidebar */}
          <div className={styles.dashboardSidebar}>
            <div className={styles.sidebarProfile}>
              <div className={styles.avatar}></div>
              <div>
                <div className={styles.profileName}>Keval Parmar</div>
                <div className={styles.profileRole}>Looking in Ahmedabad</div>
              </div>
            </div>
            <div className={styles.navMenu}>
              <div className={`${styles.navItem} ${styles.active}`}>
                <Sparkles size={14} style={{ opacity: 0.8 }} /> Matches
              </div>
              <div className={styles.navItem}>
                <HomeIcon size={14} style={{ opacity: 0.6 }} /> Properties
              </div>
              <div className={styles.navItem}>
                <MessageSquare size={14} style={{ opacity: 0.6 }} /> Messages
              </div>
              <div className={styles.navItem}>
                <Settings size={14} style={{ opacity: 0.6 }} /> Settings
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className={styles.dashboardContent}>
            <div className={styles.contentHeader}>
              <div className={styles.contentTitle}>Recommended for You</div>
              <button className="btn-secondary" style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>Filter</button>
            </div>

            <div className={styles.contentRow}>
              {/* AI Match Card */}
              <div className={styles.matchCard}>
                <div className={styles.matchLabel}>Top Personality Match</div>
                <div className={styles.matchScore}>98%</div>
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "auto" }}>Based on lifestyle & habits</div>
              </div>

              {/* Property Card */}
              <div className={styles.propertyCard}>
                <div className={styles.propertyImage}></div>
                <div className={styles.propertyInfo}>
                  <div className={styles.propTitle}>Premium 3BHK in SG Highway</div>
                  <div className={styles.propLoc}>Ahmedabad • 2km from workplace</div>
                  <div className={styles.propPrice}>₹18,000<span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 400 }}>/mo</span></div>
                </div>
              </div>
            </div>

            <div className={styles.contentBody}>
              <div className={styles.listHeader}>
                <div>Potential Roommates</div>
                <div>Match</div>
                <div>Status</div>
              </div>
              <div className={styles.listItem}>
                <div className={styles.itemMain}>
                  <div className={styles.itemAvatar} style={{ background: "linear-gradient(45deg, #f72585, #7209b7)" }}></div>
                  <div>Rahul Sharma</div>
                </div>
                <div style={{ color: "#27c93f", fontWeight: 500 }}>94%</div>
                <div style={{ color: "var(--text-secondary)" }}>Active</div>
              </div>
              <div className={styles.listItem} style={{ borderBottom: "none" }}>
                <div className={styles.itemMain}>
                  <div className={styles.itemAvatar} style={{ background: "linear-gradient(45deg, #4cc9f0, #4361ee)" }}></div>
                  <div>Priya Desai</div>
                </div>
                <div style={{ color: "#ffbd2e", fontWeight: 500 }}>88%</div>
                <div style={{ color: "var(--text-secondary)" }}>Pending</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <section className={styles.featuresSection} id="features">
        <div className={styles.glassCard} onMouseMove={handleMouseMove}>
          <div className={styles.cardIcon}>
            <Sparkles size={24} style={{ color: "var(--accent-blue)" }} />
          </div>
          <h3 className={styles.cardTitle}>Intelligent Matchmaking</h3>
          <p className={styles.cardDesc}>
            Our vector-based system analyzes lifestyle traits to pair you with highly compatible roommates, ensuring a seamless and harmonious living experience.
          </p>
        </div>

        <div className={styles.glassCard} onMouseMove={handleMouseMove}>
          <div className={styles.cardIcon}>
            <Compass size={24} style={{ color: "var(--accent-blue)" }} />
          </div>
          <h3 className={styles.cardTitle}>Spatial Discovery</h3>
          <p className={styles.cardDesc}>
            Explore curated properties across Ahmedabad and Rajkot with exact geographical precision, filtering by commute and lifestyle preferences.
          </p>
        </div>

        <div className={styles.glassCard} onMouseMove={handleMouseMove}>
          <div className={styles.cardIcon}>
            <ShieldCheck size={24} style={{ color: "var(--accent-blue)" }} />
          </div>
          <h3 className={styles.cardTitle}>Verified Profiles</h3>
          <p className={styles.cardDesc}>
            Experience complete peace of mind. Every profile undergoes rigorous KYC verification and is secured with bank-grade AES-256 encryption.
          </p>
        </div>

        <div className={styles.glassCard} onMouseMove={handleMouseMove}>
          <div className={styles.cardIcon}>
            <CreditCard size={24} style={{ color: "var(--accent-blue)" }} />
          </div>
          <h3 className={styles.cardTitle}>Seamless Payments</h3>
          <p className={styles.cardDesc}>
            Found your ideal space? Secure it instantly by paying the token amount directly through our integrated, secure gateway.
          </p>
        </div>
      </section>
    </main>
  );
}
