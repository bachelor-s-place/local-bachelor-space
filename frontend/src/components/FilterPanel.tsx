import React from 'react';
import styles from './FilterPanel.module.css';
import { LIFESTYLE_TRAITS } from '@/lib/constants';
import { PropertySearchFilter } from '@/types/property';

interface FilterPanelProps {
  filters: PropertySearchFilter;
  onChange: (newFilters: PropertySearchFilter) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function FilterPanel({ filters, onChange, isOpenMobile, onCloseMobile }: FilterPanelProps) {
  
  const handleTypeChange = (type: string) => {
    onChange({ ...filters, property_type: type === 'all' ? undefined : type, page: 1 });
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, isMax: boolean) => {
    const val = e.target.value ? parseInt(e.target.value) : undefined;
    if (isMax) {
      onChange({ ...filters, max_rent: val, page: 1 });
    } else {
      onChange({ ...filters, min_rent: val, page: 1 });
    }
  };

  const toggleTag = (tag: string) => {
    const currentTags = filters.lifestyle_tags || [];
    let newTags;
    if (currentTags.includes(tag)) {
      newTags = currentTags.filter(t => t !== tag);
    } else {
      newTags = [...currentTags, tag];
    }
    onChange({ ...filters, lifestyle_tags: newTags, page: 1 });
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpenMobile && <div className={styles.overlay} onClick={onCloseMobile}></div>}

      <div className={`${styles.panel} ${isOpenMobile ? styles.openMobile : ''}`}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filters</h2>
          {isOpenMobile && (
            <button className={styles.closeBtn} onClick={onCloseMobile}>✕</button>
          )}
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Property Type</h3>
          <div className={styles.radioGroup}>
            {['all', 'pg', 'flat', 'studio', 'room'].map(type => (
              <label key={type} className={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="property_type" 
                  checked={filters.property_type === type || (type === 'all' && !filters.property_type)}
                  onChange={() => handleTypeChange(type)}
                />
                <span>{type.toUpperCase()}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Gender</h3>
          <div className={styles.radioGroup}>
            {[
              { val: '', label: 'All' },
              { val: 'male', label: 'Male Only' },
              { val: 'female', label: 'Female Only' },
              { val: 'any', label: 'Mixed / Any' }
            ].map(type => (
              <label key={type.val} className={styles.radioLabel}>
                <input 
                  type="radio" 
                  name="for_gender" 
                  checked={filters.for_gender === type.val || (!filters.for_gender && type.val === '')}
                  onChange={() => onChange({ ...filters, for_gender: type.val || undefined, page: 1 })}
                />
                <span>{type.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Monthly Rent (₹)</h3>
          <div className={styles.priceInputs}>
            <input 
              type="number" 
              placeholder="Min" 
              className={styles.input}
              value={filters.min_rent || ''}
              onChange={(e) => handlePriceChange(e, false)}
            />
            <span className={styles.priceTo}>-</span>
            <input 
              type="number" 
              placeholder="Max" 
              className={styles.input}
              value={filters.max_rent || ''}
              onChange={(e) => handlePriceChange(e, true)}
            />
          </div>
        </div>

        <div className={styles.divider}></div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Lifestyle Match</h3>
          <p className={styles.sectionSubtitle}>Select traits to boost match scores</p>
          <div className={styles.chipsContainer}>
            {LIFESTYLE_TRAITS.map(trait => {
              const isSelected = (filters.lifestyle_tags || []).includes(trait.label);
              return (
                <button
                  key={trait.id}
                  className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`}
                  onClick={() => toggleTag(trait.label)}
                >
                  <span className={styles.chipIcon}>{trait.icon}</span>
                  {trait.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
