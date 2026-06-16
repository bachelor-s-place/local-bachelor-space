"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import styles from "./page.module.css";

// Leaflet requires browser APIs — must be dynamically imported with ssr:false
const LocationPicker = dynamic(() => import("@/components/LocationPicker"), { ssr: false });

const LIFESTYLE_TAG_OPTIONS = [
  { value: "early_bird", label: "🌅 Early Bird" },
  { value: "night_owl", label: "🦉 Night Owl" },
  { value: "non_smoker", label: "🚭 Non-Smoker" },
  { value: "smoker_ok", label: "🚬 Smoker OK" },
  { value: "no_alcohol", label: "🚫 No Alcohol" },
  { value: "alcohol_ok", label: "🍻 Alcohol OK" },
  { value: "vegetarian", label: "🥗 Vegetarian" },
  { value: "non_veg_ok", label: "🍗 Non-Veg OK" },
  { value: "fitness_freak", label: "💪 Fitness Freak" },
  { value: "introverted", label: "📚 Introvert" },
  { value: "social", label: "🎉 Social" },
  { value: "pet_friendly", label: "🐾 Pet Friendly" },
  { value: "no_pets", label: "🚫 No Pets" },
  { value: "work_from_home", label: "💻 WFH" },
  { value: "students_only", label: "🎓 Students Only" },
  { value: "working_professionals", label: "👔 Working Professionals" },
];



export default function NewPropertyPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    property_type: "flat",
    total_capacity: "1",
    rent_amount: "",
    deposit_amount: "",
    for_gender: "any",
    token_percentage: "5",
  });

  // Location state — managed separately via LocationPicker
  const [location, setLocation] = useState({
    lat: 23.0225,
    lng: 72.5714,
    address: "",
    city: "Ahmedabad",
    locality: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Callback from LocationPicker — parses city and locality from Nominatim address
  const handleLocationChange = (lat: number, lng: number, address: string) => {
    // Try to extract locality and city from the returned display_name
    // Nominatim format: "Detail, Locality, City, State, Country"
    const parts = address.split(",").map(p => p.trim());
    const city = parts.find(p =>
      ["Ahmedabad", "Rajkot", "Gandhinagar", "Surat"].some(c => p.includes(c))
    ) || "Ahmedabad";
    const locality = parts.length > 2 ? parts[1] : "";
    setLocation({ lat, lng, address, city, locality });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : prev.length < 10 ? [...prev, tag] : prev
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description || undefined,
        property_type: formData.property_type,
        city: location.city,
        locality: location.locality,
        address_text: location.address || undefined,
        location_lat: location.lat,
        location_lng: location.lng,
        total_capacity: Number(formData.total_capacity),
        lifestyle_tags: selectedTags,
        for_gender: formData.for_gender,
        token_percentage: Number(formData.token_percentage),
      };

      if (formData.property_type !== "pg") {
        if (!formData.rent_amount) {
          setError("Monthly rent is required for non-PG properties.");
          setSubmitting(false);
          return;
        }
        payload.rent_amount = Number(formData.rent_amount);
        if (formData.deposit_amount) {
          payload.deposit_amount = Number(formData.deposit_amount);
        }
      }

      await apiFetch("/properties", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Redirect to properties list (not the edit page)
      router.push("/landlord/properties");
    } catch (err: any) {
      setError(err.message || "Failed to create property");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Link href="/landlord/properties" className={styles.backLink}>← Back to Properties</Link>
        <h1 className={styles.title}>List New Property</h1>
        <p className={styles.subtitle}>Fill in the details below. Your listing starts as a draft — submit it for admin verification once ready.</p>
      </div>

      <div className={styles.card}>
        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.errorMessage}>{error}</div>}

          {/* ── Basic Info ─────────────────────────────────── */}
          <div className={styles.formSection}>
            <h3>Basic Information</h3>

            <div className={styles.inputGroup}>
              <label>Property Title <span className={styles.required}>*</span></label>
              <input
                type="text"
                name="title"
                required
                minLength={5}
                maxLength={100}
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Spacious 2BHK near PDPU, fully furnished"
              />
              <span className={styles.hint}>{formData.title.length}/100 characters</span>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>Property Type <span className={styles.required}>*</span></label>
                <select name="property_type" value={formData.property_type} onChange={handleChange}>
                  <option value="flat">🏠 Flat / Apartment</option>
                  <option value="room">🚪 Single Room</option>
                  <option value="studio">🛋️ Studio</option>
                  <option value="pg">🏢 PG (Paying Guest)</option>
                </select>
              </div>
              <div className={styles.inputGroup}>
                <label>Total Capacity <span className={styles.required}>*</span></label>
                <input
                  type="number"
                  name="total_capacity"
                  required
                  min="1"
                  max="20"
                  value={formData.total_capacity}
                  onChange={handleChange}
                  placeholder="Max tenants"
                />
              </div>
            </div>

            <div className={styles.inputRow}>
              <div className={styles.inputGroup}>
                <label>We need room for... <span className={styles.required}>*</span></label>
                <select name="for_gender" value={formData.for_gender} onChange={handleChange}>
                  <option value="any">Any (Mixed/Family)</option>
                  <option value="male">Bachelors (Male)</option>
                  <option value="female">Bachelors (Female)</option>
                </select>
              </div>
            </div>

            {formData.property_type === "pg" && (
              <div className={styles.infoBanner}>
                ℹ️ For PG properties, rent is set per-room after creation. Use <strong>Manage Rooms</strong> to add rooms with individual pricing.
              </div>
            )}

            <div className={styles.inputGroup}>
              <label>Description</label>
              <textarea
                name="description"
                rows={4}
                maxLength={1000}
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe the space — nearby landmarks, rules, what makes it special..."
              />
              <span className={styles.hint}>{formData.description.length}/1000 characters</span>
            </div>
          </div>

          {/* ── Location ───────────────────────────────────── */}
          <div className={styles.formSection}>
            <h3>Location</h3>
            <p className={styles.sectionSubtitle}>
              Search for your property address or click anywhere on the map to pin the exact location.
            </p>
            <LocationPicker
              initialLat={location.lat}
              initialLng={location.lng}
              onLocationChange={handleLocationChange}
            />
            {location.address && (
              <div className={styles.selectedAddress}>
                <strong>Selected:</strong> {location.address}
              </div>
            )}
          </div>

          {/* ── Pricing & Token ────────────────────────────── */}
          <div className={styles.formSection}>
            <h3>Pricing & Booking</h3>
            
            {formData.property_type !== "pg" && (
              <div className={styles.inputRow}>
                <div className={styles.inputGroup}>
                  <label>Monthly Rent (₹) <span className={styles.required}>*</span></label>
                  <input
                    type="number"
                    name="rent_amount"
                    required={formData.property_type !== "pg"}
                    min="0"
                    step="500"
                    value={formData.rent_amount}
                    onChange={handleChange}
                    placeholder="e.g. 12000"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Security Deposit (₹)</label>
                  <input
                    type="number"
                    name="deposit_amount"
                    min="0"
                    step="500"
                    value={formData.deposit_amount}
                    onChange={handleChange}
                    placeholder="e.g. 24000"
                  />
                  <span className={styles.hint}>Typically 1–2 months rent.</span>
                </div>
              </div>
            )}

            <div className={styles.inputGroup} style={{ marginTop: formData.property_type !== "pg" ? '1rem' : '0' }}>
              <label>Token Percentage (%) <span className={styles.required}>*</span></label>
              <input
                type="number"
                name="token_percentage"
                required
                min="0"
                max="15"
                step="0.1"
                value={formData.token_percentage}
                onChange={handleChange}
                placeholder="e.g. 5"
              />
              <span className={styles.hint}>Percentage of the first month's rent required to book the property (up to 15%).</span>
            </div>
          </div>

          {/* ── Lifestyle Tags ─────────────────────────────── */}
          <div className={styles.formSection}>
            <h3>Who is this property for?</h3>
            <p className={styles.sectionSubtitle}>
              Select tags that match your ideal tenants. Our matchmaking system uses these to surface your property to compatible squads.
            </p>
            <div className={styles.tagGrid}>
              {LIFESTYLE_TAG_OPTIONS.map(tag => (
                <button
                  key={tag.value}
                  type="button"
                  className={`${styles.tagChip} ${selectedTags.includes(tag.value) ? styles.tagActive : ""}`}
                  onClick={() => toggleTag(tag.value)}
                >
                  {tag.label}
                </button>
              ))}
            </div>
            <span className={styles.hint}>{selectedTags.length}/10 tags selected</span>
          </div>

          {/* ── Actions ────────────────────────────────────── */}
          <div className={styles.formActions}>
            <Link href="/landlord/properties">
              <button type="button" className="btn-secondary">Cancel</button>
            </Link>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? "Creating..." : "Create as Draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
