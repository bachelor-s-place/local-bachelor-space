"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import PropertyStatusBadge from "@/components/PropertyStatusBadge";
import styles from "./page.module.css";

type Property = {
  id: string;
  title: string;
  property_type: string;
  status: string;
  rent_amount: number;
  city: string;
  locality: string;
};

export default function LandlordPropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/properties/me")
      .then((res) => setProperties(res.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>My Properties</h1>
          <p className={styles.subtitle}>Manage your listings and room availability.</p>
        </div>
        <Link href="/landlord/properties/new">
          <button className="btn-primary">+ Add Property</button>
        </Link>
      </div>

      {loading ? (
        <div className={styles.loading}>Loading properties...</div>
      ) : properties.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>🏢</div>
          <h3>No properties yet</h3>
          <p>You haven&apos;t listed any properties. Start by adding your first one.</p>
          <Link href="/landlord/properties/new">
            <button className="btn-secondary" style={{ marginTop: "1rem" }}>Add Property</button>
          </Link>
        </div>
      ) : (
        <div className={styles.grid}>
          {properties.map(p => (
            <div key={p.id} className={styles.propertyCard}>
              <div className={styles.cardImage}></div>
              <div className={styles.cardContent}>
                <div className={styles.cardHeader}>
                  <PropertyStatusBadge status={p.status} />
                  <span className={styles.typeBadge}>{p.property_type}</span>
                </div>
                <h3 className={styles.propertyTitle}>{p.title}</h3>
                <p className={styles.propertyLoc}>{p.locality}, {p.city}</p>
                <div className={styles.cardFooter}>
                  <div className={styles.price}>
                    {p.rent_amount ? `₹${p.rent_amount}/mo` : "PG Room Pricing"}
                  </div>
                  <Link href={`/landlord/properties/${p.id}`}>
                    <button className={styles.manageBtn}>Manage</button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
