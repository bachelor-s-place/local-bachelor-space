'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageGallery from '@/components/ImageGallery';
import { apiFetch } from '@/lib/api';
import { Property, Room } from '@/types/property';
import { useAuth } from '@/context/AuthContext';
import styles from './page.module.css';

export default function PropertyDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [property, setProperty] = useState<Property | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [mySquadId, setMySquadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [proposing, setProposing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPropertyDetails = async () => {
      try {
        const response = await apiFetch(`/properties/${id}`);
        setProperty(response.data);

        // If it's a PG, fetch the rooms too
        if (response.data.property_type === 'pg') {
          try {
            const roomsResponse = await apiFetch(`/properties/${id}/rooms`);
            setRooms(roomsResponse.data || []);
          } catch (e) {
            console.error("Failed to fetch rooms:", e);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Property not found');
      } finally {
        setLoading(false);
      }
    };

    const fetchMySquad = async () => {
      if (user && user.role === 'tenant') {
        try {
          const res = await apiFetch('/squads/mine');
          if (res.data && res.data.id) {
            setMySquadId(res.data.id);
          }
        } catch (e) {
          // No squad or error
        }
      }
    };

    fetchPropertyDetails();
    fetchMySquad();
  }, [id, user]);

  const handleProposeProperty = async (roomId?: string) => {
    if (!mySquadId) {
      alert("You need to be in a squad to propose a property!");
      router.push('/squad');
      return;
    }
    
    setProposing(true);
    try {
      await apiFetch(`/squads/${mySquadId}/proposals`, {
        method: 'POST',
        body: JSON.stringify({
          property_id: id,
          room_id: roomId || undefined
        })
      });
      alert('Property successfully proposed to your squad!');
    } catch (err: any) {
      alert(err.message || 'Failed to propose property');
    } finally {
      setProposing(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner}></div>
        <p>Loading property details...</p>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>😕</div>
        <h2>Oops!</h2>
        <p>{error || 'Property not found'}</p>
        <Link href="/properties" className={styles.backBtn}>← Back to Search</Link>
      </div>
    );
  }

  const isPG = property.property_type === 'pg';
  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Price on request';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Link href="/properties" className={styles.backLink}>← Back to Search</Link>
        
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{property.title}</h1>
            <div className={styles.tag} style={{ textTransform: 'capitalize', background: 'rgba(0,102,204,0.15)', color: '#3399ff', borderColor: 'rgba(0,102,204,0.3)' }}>
              {property.property_type}
            </div>
            {property.status === 'verified' && (
              <div className={styles.tag} style={{ background: 'rgba(46,204,113,0.15)', color: '#2ecc71', borderColor: 'rgba(46,204,113,0.3)' }}>
                ✓ Verified
              </div>
            )}
          </div>
          <p className={styles.location}>
            📍 {property.address_text || property.locality || property.city}
          </p>
        </div>

        <ImageGallery images={[]} />

        <div className={styles.splitLayout}>
          <div className={styles.detailsColumn}>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>About this place</h2>
              <p className={styles.description}>
                {property.description || "No description provided."}
              </p>
            </div>

            <div className={styles.divider}></div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Lifestyle & Amenities</h2>
              {property.lifestyle_tags && property.lifestyle_tags.length > 0 ? (
                <div className={styles.tagsContainer}>
                  {property.lifestyle_tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyText}>No specific amenities listed.</p>
              )}
            </div>

            {isPG && rooms.length > 0 && (
              <>
                <div className={styles.divider}></div>
                <div className={styles.section}>
                  <h2 className={styles.sectionTitle}>Available Rooms</h2>
                  <p className={styles.sectionSubtitle}>Select a room type to book your bed.</p>
                  
                  <div className={styles.roomGrid}>
                    {rooms.map(room => {
                      const isFull = room.current_occupancy >= room.capacity;
                      return (
                        <div key={room.id} className={styles.roomCard}>
                          <div className={styles.roomHeader}>
                            <h4>{room.room_number ? `Room ${room.room_number}` : 'Standard Room'}</h4>
                            <div className={styles.roomPrice}>{formatCurrency(room.rent_amount)}<span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-secondary)' }}>/mo</span></div>
                          </div>
                          <p className={styles.roomDesc} style={{ textTransform: 'capitalize' }}>
                            {room.room_type} Sharing
                          </p>
                          <div className={styles.capacityBox} style={{ marginBottom: '1rem', padding: '0.5rem 0.75rem' }}>
                            <span className={styles.capacityLabel}>Occupancy</span>
                            <span className={styles.capacityValue}>
                              {room.current_occupancy} / {room.capacity}
                            </span>
                          </div>
                          
                          <div className={`${styles.roomStatus} ${isFull ? styles.occupied : styles.available}`}>
                            {isFull ? 'Fully Occupied' : 'Beds Available'}
                          </div>

                          {!isFull && user?.role === 'tenant' && (
                            <button 
                              className={styles.roomBtn} 
                              style={{ marginTop: '1rem' }} 
                              onClick={() => handleProposeProperty(room.id)}
                              disabled={proposing}
                            >
                              {proposing ? 'Proposing...' : (mySquadId ? 'Propose Room to Squad' : 'Create Squad to Propose')}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className={styles.bookingColumn}>
            <div className={styles.bookingCard}>
              <div className={styles.bookingHeader}>
                <span className={styles.priceLabel}>
                  {isPG ? 'Starting from' : 'Monthly Rent'}
                </span>
                <div className={styles.priceValue}>
                  {isPG && rooms.length > 0 
                    ? formatCurrency(Math.min(...rooms.map(r => r.rent_amount)))
                    : formatCurrency(property.rent_amount)
                  }
                  <span className={styles.period}>/mo</span>
                </div>
                {!isPG && property.deposit_amount && (
                  <div className={styles.depositInfo}>
                    Security Deposit: {formatCurrency(property.deposit_amount)}
                  </div>
                )}
              </div>

              {!isPG && (
                <div className={styles.capacityBox}>
                  <span className={styles.capacityLabel}>Total Capacity</span>
                  <span className={styles.capacityValue}>{property.total_capacity} Persons</span>
                </div>
              )}

              <div className={styles.actionButtons}>
                {user?.role === 'landlord' ? (
                  <div className={styles.roleWarning}>
                    You are logged in as a Landlord. Switch to a tenant account to book properties.
                  </div>
                ) : (
                  <>
                    <button 
                      className={styles.primaryBtn} 
                      onClick={() => handleProposeProperty()}
                      disabled={proposing}
                    >
                      {proposing ? 'Proposing...' : (mySquadId ? (isPG ? 'Propose PG to Squad' : 'Propose Flat to Squad') : 'Create Squad to Propose')}
                    </button>
                    <p className={styles.btnHint}>Propose this property to your squad to initiate approval.</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
