import React from 'react';
import styles from './PropertyCard.module.css';
import { Property } from '@/types/property';
import { MapPin } from 'lucide-react';

interface PropertyCardProps {
  property: Property;
  isActive?: boolean;
  onHover?: (id: string | null) => void;
  onClick?: (id: string) => void;
}

export default function PropertyCard({ property, isActive, onHover, onClick }: PropertyCardProps) {
  // Use a placeholder image based on property type
  const placeholderImage = property.property_type === 'pg' 
    ? 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80'
    : 'https://images.unsplash.com/photo-1502672260266-1c1de2d93688?w=500&q=80';

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Price on request';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div 
      className={`${styles.card} ${isActive ? styles.active : ''}`}
      onMouseEnter={() => onHover?.(property.id)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onClick?.(property.id)}
    >
      <div className={styles.imageContainer}>
        <img src={placeholderImage} alt={property.title} className={styles.image} />
        {property.status === 'verified' && (
          <div className={styles.verifiedBadge}>
            ✓ Verified
          </div>
        )}
        <div className={styles.typeBadge}>
          {property.property_type.toUpperCase()}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.header}>
          <h3 className={styles.title}>{property.title}</h3>
          <p className={styles.price}>
            {property.property_type === 'pg' ? 'From ' : ''}
            {formatCurrency(property.rent_amount)}
            <span className={styles.period}>/mo</span>
          </p>
        </div>

        <p className={styles.locality} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <MapPin size={14} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
          <span>{property.locality ? `${property.locality}, ${property.city}` : property.city}</span>
        </p>

        {property.lifestyle_tags && property.lifestyle_tags.length > 0 && (
          <div className={styles.tagsContainer}>
            {property.lifestyle_tags.slice(0, 3).map(tag => (
              <span key={tag} className={styles.tag}>{tag}</span>
            ))}
            {property.lifestyle_tags.length > 3 && (
              <span className={styles.tagMore}>+{property.lifestyle_tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
