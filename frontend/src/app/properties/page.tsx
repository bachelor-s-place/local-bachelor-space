'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import styles from './page.module.css';
import FilterPanel from '@/components/FilterPanel';
import PropertyCard from '@/components/PropertyCard';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Property, PropertySearchFilter, PaginatedProperties } from '@/types/property';
import { Building2 } from 'lucide-react';

// Dynamically import MapView with SSR disabled because Leaflet needs window
const MapView = dynamic(() => import('@/components/MapView'), { 
  ssr: false,
  loading: () => <div className={styles.mapLoading}>Loading map...</div>
});

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [filters, setFilters] = useState<PropertySearchFilter>({ page: 1, per_page: 20 });
  const [activePropertyId, setActivePropertyId] = useState<string | null>(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Fetch properties based on filters
  const fetchProperties = useCallback(async (currentFilters: PropertySearchFilter) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (currentFilters.min_rent) params.append('min_rent', currentFilters.min_rent.toString());
      if (currentFilters.max_rent) params.append('max_rent', currentFilters.max_rent.toString());
      if (currentFilters.for_gender) params.append('for_gender', currentFilters.for_gender);
      
      if (currentFilters.lat && currentFilters.lng && currentFilters.radius_km) {
        params.append('lat', currentFilters.lat.toString());
        params.append('lng', currentFilters.lng.toString());
        params.append('radius_km', currentFilters.radius_km.toString());
      }

      const response = await apiFetch(`/properties?${params.toString()}`);
      
      // Backend returns an array directly in data
      let data = (response.data as Property[]) || [];

      // Since the backend currently doesn't filter by property_type or lifestyle_tags,
      // we must apply these filters on the frontend side strictly as per instructions.
      if (currentFilters.property_type && currentFilters.property_type !== 'all') {
        data = data.filter(p => p.property_type === currentFilters.property_type);
      }

      if (currentFilters.lifestyle_tags && currentFilters.lifestyle_tags.length > 0) {
        data = data.filter(p => {
          // Check if property has ALL the selected tags
          return currentFilters.lifestyle_tags!.every(tag => 
            (p.lifestyle_tags || []).includes(tag)
          );
        });
      }

      setProperties(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and fetch on filter change
  useEffect(() => {
    fetchProperties(filters);
  }, [filters, fetchProperties]);

  // Pre-populate gender filter once auth is loaded (if not already set and user has gender)
  useEffect(() => {
    if (!authLoading && user?.gender && !filters.for_gender) {
      setFilters(prev => ({ ...prev, for_gender: user.gender }));
    }
  }, [user, authLoading]);

  const handleBoundsChange = (bounds: any) => {
    // In a real app, we would update lat/lng/radius here and trigger a refetch
    // For now, we fetch all (as we only have a few dummy ones)
  };

  const handleCardClick = (id: string) => {
    router.push(`/properties/${id}`);
  };

  return (
    <main className={styles.container}>
      <FilterPanel 
        filters={filters}
        onChange={setFilters}
        isOpenMobile={isMobileFilterOpen}
        onCloseMobile={() => setIsMobileFilterOpen(false)}
      />

      <div className={styles.contentArea}>
        {/* Mobile header controls */}
        <div className={styles.mobileHeader}>
          <button 
            className={styles.filterToggleBtn}
            onClick={() => setIsMobileFilterOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            Filters
          </button>
          <div className={styles.resultsCount}>
            {properties.length} properties found
          </div>
        </div>

        {/* Map View (Top half on mobile, right side on desktop) */}
        <div className={styles.mapSection}>
          <MapView 
            properties={properties}
            activePropertyId={activePropertyId}
            onMarkerClick={(id) => {
              setActivePropertyId(id);
              // Scroll the corresponding card into view if needed
              document.getElementById(`prop-card-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }}
            onBoundsChange={handleBoundsChange}
          />
        </div>

        {/* List View (Bottom half on mobile, left side on desktop) */}
        <div className={styles.listSection}>
          <div className={styles.listHeader}>
            <h1 className={styles.title}>Properties in Ahmedabad</h1>
            <p className={styles.subtitle}>{properties.length} results matching your criteria</p>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {loading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <p>Finding the perfect spots...</p>
            </div>
          ) : properties.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                <Building2 size={48} style={{ color: 'var(--accent-blue)', opacity: 0.8 }} />
              </div>
              <h3>No properties found</h3>
              <p>Try adjusting your filters or search area.</p>
              <button 
                className={styles.resetBtn}
                onClick={() => setFilters({ page: 1, per_page: 20 })}
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {properties.map(property => (
                <div id={`prop-card-${property.id}`} key={property.id}>
                  <PropertyCard 
                    property={property}
                    isActive={activePropertyId === property.id}
                    onHover={setActivePropertyId}
                    onClick={handleCardClick}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
