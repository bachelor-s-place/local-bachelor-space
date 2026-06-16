"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import formStyles from "../new/page.module.css";

export default function EditPropertyPage() {
  const { id } = useParams();
  const router = useRouter();

  const [property, setProperty] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    rent_amount: "",
    deposit_amount: "",
    total_capacity: "",
    for_gender: "any",
    token_percentage: "5",
  });

  useEffect(() => {
    apiFetch(`/properties/${id}`)
      .then((res) => {
        const p = res.data;
        setProperty(p);
        setFormData({
          title: p.title || "",
          description: p.description || "",
          rent_amount: p.rent_amount || "",
          deposit_amount: p.deposit_amount || "",
          total_capacity: p.total_capacity || "",
          for_gender: p.for_gender || "any",
          token_percentage: p.token_percentage || "5",
        });
      })
      .catch(() => router.push("/landlord/properties"))
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        total_capacity: Number(formData.total_capacity),
        for_gender: formData.for_gender,
        token_percentage: Number(formData.token_percentage),
      };

      if (property.property_type !== "pg") {
        payload.rent_amount = Number(formData.rent_amount);
        payload.deposit_amount = Number(formData.deposit_amount);
      }

      await apiFetch(`/properties/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });

      setSuccessMsg("Property updated successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to update property");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: "2rem", color: "#fff" }}>Loading property details...</div>;
  if (!property) return null;

  return (
    <div className={formStyles.container}>
      <div className={formStyles.header}>
        <Link href="/landlord/properties" className={formStyles.backLink}>← Back to Properties</Link>
        <h1 className={formStyles.title}>Edit Property</h1>
        <p className={formStyles.subtitle}>Manage your listing details.</p>
      </div>

      <div className={formStyles.card}>
        <form className={formStyles.form} onSubmit={handleUpdate}>
          {error && <div className={formStyles.errorMessage}>{error}</div>}
          {successMsg && (
            <div style={{ padding: "0.75rem", background: "rgba(39, 201, 63, 0.1)", border: "0.5px solid rgba(39, 201, 63, 0.3)", borderRadius: "8px", color: "#27c93f", fontSize: "0.85rem" }}>
              {successMsg}
            </div>
          )}

          <div className={formStyles.formSection}>
            <h3>Basic Details</h3>

            <div className={formStyles.inputGroup}>
              <label>Property Title</label>
              <input type="text" name="title" required value={formData.title} onChange={handleChange} />
            </div>

            <div className={formStyles.inputRow}>
              <div className={formStyles.inputGroup}>
                <label>Property Type</label>
                <input type="text" value={property.property_type} disabled style={{ textTransform: "capitalize", opacity: 0.7 }} />
              </div>
              <div className={formStyles.inputGroup}>
                <label>Total Capacity</label>
                <input type="number" name="total_capacity" required min="1" value={formData.total_capacity} onChange={handleChange} />
              </div>
            </div>

            <div className={formStyles.inputRow}>
              <div className={formStyles.inputGroup}>
                <label>We need room for... <span className={formStyles.required}>*</span></label>
                <select name="for_gender" value={formData.for_gender} onChange={handleChange}>
                  <option value="any">Any (Mixed/Family)</option>
                  <option value="male">Bachelors (Male)</option>
                  <option value="female">Bachelors (Female)</option>
                </select>
              </div>
            </div>

            <div className={formStyles.inputGroup}>
              <label>Description</label>
              <textarea name="description" rows={4} value={formData.description} onChange={handleChange} />
            </div>
          </div>

          {property.property_type !== "pg" && (
            <div className={formStyles.formSection}>
              <h3>Pricing</h3>
              <div className={formStyles.inputRow}>
                <div className={formStyles.inputGroup}>
                  <label>Monthly Rent (₹)</label>
                  <input type="number" name="rent_amount" required min="0" value={formData.rent_amount} onChange={handleChange} />
                </div>
                <div className={formStyles.inputGroup}>
                  <label>Security Deposit (₹)</label>
                  <input type="number" name="deposit_amount" required min="0" value={formData.deposit_amount} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          <div className={formStyles.formSection}>
            <h3>Booking & Token</h3>
            <div className={formStyles.inputGroup}>
              <label>Token Percentage (%)</label>
              <input
                type="number"
                name="token_percentage"
                required
                min="0"
                max="15"
                step="0.1"
                value={formData.token_percentage}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={formStyles.formActions}>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>

        {property.property_type === "pg" && (
          <div style={{ padding: "1.5rem", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "0.5px solid rgba(255,255,255,0.05)", marginTop: "2.5rem" }}>
            <h3 style={{ color: "#fff", marginBottom: "0.5rem", fontSize: "1.2rem" }}>PG Rooms Management</h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
              This is a PG property. Rent and availability are managed at the room level.
            </p>
            <Link href={`/landlord/properties/${id}/rooms`}>
              <button className="btn-secondary">Manage Rooms →</button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
