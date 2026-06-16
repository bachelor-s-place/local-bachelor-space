'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import BrandLogo from '@/components/BrandLogo';
import styles from './page.module.css';
import { apiFetch } from '@/lib/api';
import { LIFESTYLE_TRAITS, BUDGET_RANGES } from '@/lib/constants';
import { useAuth } from '@/context/AuthContext';

export default function Onboarding() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  // Step tracking (now 2 steps total)
  const [step, setStep] = useState(1);

  // Step 1: Location
  const [city, setCity] = useState('ahmedabad');
  const [locality, setLocality] = useState('');

  // Step 2: Profile
  const [bio, setBio] = useState('');
  const [budget, setBudget] = useState('10000');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [gender, setGender] = useState(user?.gender || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (id: string) => {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleNext = () => {
    if (step < 2) setStep((s) => s + 1);
  };

  const handleComplete = async () => {
    setError('');
    setLoading(true);

    const { min, max } = BUDGET_RANGES[budget] ?? { min: 10000, max: 15000 };

    // Gender is required for tenants (drives single-gender squad matching). The field
    // only shows when the account has no gender yet (e.g. Google sign-ups).
    if (!user?.gender && !gender) {
      setError('Please select your gender to continue.');
      setLoading(false);
      return;
    }

    try {
      const payload: any = {
        bio,
        budget_min: min,
        budget_max: max,
        lifestyle_tags: selectedTags,
        preferred_localities: locality ? [locality] : [],
      };
      if (gender) {
        payload.gender = gender;
      }

      await apiFetch('/users/me/profile', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      // Refresh AuthContext so the dashboard banner knows the profile is done
      await refreshUser();
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push('/dashboard');
  };

  return (
    <main className={styles.container}>
      <div className={styles.glassCard}>

        {/* Brand */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <BrandLogo size="1.6rem" />
        </div>

        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          <div className={`${styles.dot} ${step >= 1 ? styles.active : ''}`} />
          <div className={`${styles.dot} ${step >= 2 ? styles.active : ''}`} />
        </div>

        {/* Header */}
        <div className={styles.header}>
          <h1 className={styles.title}>
            {step === 1 && 'Where are you looking?'}
            {step === 2 && 'Tell us about yourself'}
          </h1>
          <p className={styles.subtitle}>
            {step === 1 && "We're currently live in Ahmedabad & Rajkot."}
            {step === 2 && 'This helps our AI find your perfect match.'}
          </p>
        </div>

        {/* ── Step 1: Location ────────────────────────────────────────── */}
        {step === 1 && (
          <div className={styles.inputGroup}>
            <label className={styles.label}>Select City</label>
            <select
              className={styles.select}
              value={city}
              onChange={(e) => setCity(e.target.value)}
            >
              <option value="ahmedabad">Ahmedabad</option>
              <option value="rajkot">Rajkot</option>
            </select>

            <label className={styles.label} style={{ marginTop: '1.25rem' }}>
              Target Locality <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. SG Highway, Navrangpura"
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
            />
          </div>
        )}

        {/* ── Step 2: Profile ─────────────────────────────────────────── */}
        {step === 2 && (
          <div className={styles.inputGroup}>
            {/* Lifestyle Tags */}
            <label className={styles.label}>Lifestyle Tags</label>
            <p className={styles.tagHint}>Select all that describe you — our AI uses this for matching.</p>
            <div className={styles.tagsGrid}>
              {LIFESTYLE_TRAITS.map((trait) => (
                <button
                  key={trait.id}
                  type="button"
                  className={`${styles.chip} ${selectedTags.includes(trait.id) ? styles.chipActive : ''}`}
                  onClick={() => toggleTag(trait.id)}
                >
                  {trait.label}
                </button>
              ))}
            </div>

            {/* Gender */}
            {!user?.gender && (
              <>
                <label className={styles.label} style={{ marginTop: '1.5rem' }}>
                  Gender <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Required)</span>
                </label>
                <select
                  className={styles.select}
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  required
                >
                  <option value="">Select gender...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </>
            )}

            {/* Bio */}
            <label className={styles.label} style={{ marginTop: '1.5rem' }}>
              Short Bio <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>(Optional)</span>
            </label>
            <input
              className={styles.input}
              type="text"
              placeholder="I'm a software engineer who loves hiking and quiet evenings..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />

            {/* Budget */}
            <label className={styles.label} style={{ marginTop: '1.25rem' }}>Monthly Budget</label>
            <select
              className={styles.select}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            >
              <option value="5000">₹5,000 – ₹10,000</option>
              <option value="10000">₹10,000 – ₹15,000</option>
              <option value="15000">₹15,000 – ₹20,000</option>
              <option value="20000">₹20,000+</option>
            </select>

            {error && (
              <div className={styles.errorMsg}>{error}</div>
            )}
          </div>
        )}

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className={styles.actions}>
          {step < 2 ? (
            <>
              <button
                className={styles.btnSkip}
                onClick={handleSkip}
                type="button"
              >
                Skip for now
              </button>
              <button
                className={styles.btnNext}
                onClick={handleNext}
                type="button"
              >
                Continue →
              </button>
            </>
          ) : (
            <>
              <button
                className={styles.btnSkip}
                onClick={handleSkip}
                type="button"
              >
                Skip for now
              </button>
              <button
                className={styles.btnNext}
                onClick={handleComplete}
                disabled={loading || selectedTags.length === 0}
                style={{ opacity: selectedTags.length === 0 ? 0.5 : 1 }}
                type="button"
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            </>
          )}
        </div>

      </div>
    </main>
  );
}
