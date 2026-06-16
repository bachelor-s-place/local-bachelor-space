'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import styles from './LocationPicker.module.css';

// Fix Leaflet default marker icon broken in webpack/Next.js
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

type LatLng = { lat: number; lng: number };

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

interface LocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (lat: number, lng: number, address: string) => void;
}

// Inner component: moves map when position changes
function MapController({ position }: { position: LatLng }) {
  const map = useMap();
  useEffect(() => {
    map.setView([position.lat, position.lng], 16, { animate: true });
  }, [map, position.lat, position.lng]);
  return null;
}

// Inner component: handles click-to-pin
function ClickHandler({ onPick }: { onPick: (latlng: LatLng) => void }) {
  useMapEvents({
    click(e) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function LocationPicker({ initialLat = 23.0225, initialLng = 72.5714, onLocationChange }: LocationPickerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [position, setPosition] = useState<LatLng>({ lat: initialLat, lng: initialLng });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      const address = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onLocationChange(lat, lng, address);
      setQuery(address);
    } catch {
      onLocationChange(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  }, [onLocationChange]);

  // Debounced search via Nominatim
  const handleSearchInput = (value: string) => {
    setQuery(value);
    setShowResults(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data: NominatimResult[] = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const selectResult = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setPosition({ lat, lng });
    setQuery(result.display_name);
    setResults([]);
    setShowResults(false);
    onLocationChange(lat, lng, result.display_name);
  };

  const handleMapClick = (latlng: LatLng) => {
    setPosition(latlng);
    reverseGeocode(latlng.lat, latlng.lng);
  };

  return (
    <div className={styles.wrapper}>
      {/* ── Collapsed State (Button) ─────────────────────────── */}
      <button 
        type="button" 
        className={styles.openModalBtn} 
        onClick={() => setIsModalOpen(true)}
      >
        <span className={styles.pinIcon}>📍</span>
        {query || "Click to pin location on map"}
      </button>

      {/* ── Modal Overlay ────────────────────────────────── */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h4>Select Property Location</h4>
              <button 
                type="button" 
                className={styles.closeBtn} 
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className={styles.searchBox}>
              <span className={styles.searchIcon}>🔍</span>
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search address or landmark... (e.g. D-Mart Navrangpura)"
                value={query}
                onChange={(e) => handleSearchInput(e.target.value)}
                onFocus={() => results.length > 0 && setShowResults(true)}
                autoComplete="off"
              />
              {searching && <span className={styles.spinner}>⟳</span>}
            </div>

            {showResults && results.length > 0 && (
              <div className={styles.resultsList}>
                {results.map((r) => (
                  <button
                    key={r.place_id}
                    type="button"
                    className={styles.resultItem}
                    onClick={() => selectResult(r)}
                  >
                    <span className={styles.resultIcon}>📍</span>
                    <span className={styles.resultText}>{r.display_name}</span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.mapContainer}>
              <MapContainer
                center={[position.lat, position.lng]}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                zoomControl={true}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <MapController position={position} />
                <ClickHandler onPick={handleMapClick} />
                <Marker position={[position.lat, position.lng]} icon={defaultIcon} />
              </MapContainer>
              <div className={styles.mapHint}>Click anywhere on the map to pin your exact location</div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.coords}>
                <span>📌 {position.lat.toFixed(6)}, {position.lng.toFixed(6)}</span>
              </div>
              <button 
                type="button" 
                className={styles.confirmBtn}
                onClick={() => setIsModalOpen(false)}
              >
                Confirm Location
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
