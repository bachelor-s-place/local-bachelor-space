import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Property } from '@/types/property';
import styles from './MapView.module.css';

interface MapViewProps {
  properties: Property[];
  activePropertyId: string | null;
  onMarkerClick: (id: string) => void;
  onBoundsChange?: (bounds: L.LatLngBounds) => void;
}

// We need to fix the default icon issue with Leaflet in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// A component to handle map events
function MapEvents({ onBoundsChange }: { onBoundsChange?: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      if (onBoundsChange) {
        onBoundsChange(map.getBounds());
      }
    },
  });
  return null;
}

// A component to auto-fit bounds when properties change
function FitBounds({ properties }: { properties: Property[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (properties.length > 0) {
      const bounds = L.latLngBounds(properties.map(p => [p.location_lat, p.location_lng]));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [properties, map]);
  
  return null;
}

export default function MapView({ properties, activePropertyId, onMarkerClick, onBoundsChange }: MapViewProps) {
  // Use a key to force complete re-initialization on mount to bypass Turbopack/Strict Mode bugs
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, []);

  // Default center: Ahmedabad
  const center: L.LatLngExpression = [23.0225, 72.5714];

  // Create custom DivIcon for markers
  const createCustomIcon = (property: Property, isActive: boolean) => {
    const isVerified = property.status === 'verified';
    const rent = property.rent_amount 
      ? `₹${(property.rent_amount / 1000).toFixed(1)}k` 
      : property.property_type.toUpperCase();

    const html = `
      <div class="${styles.markerPin} ${isActive ? styles.markerActive : ''} ${isVerified ? styles.markerVerified : ''}">
        <span class="${styles.markerText}">${rent}</span>
      </div>
    `;

    return L.divIcon({
      className: 'custom-div-icon',
      html,
      iconSize: [48, 28],
      iconAnchor: [24, 28], // Point to the bottom center
      popupAnchor: [0, -28],
    });
  };

  if (mapKey === 0) return <div className={styles.map} />;

  return (
    <div className={styles.mapWrapper}>
      <MapContainer 
        key={mapKey}
        center={center} 
        zoom={12} 
        scrollWheelZoom={true} 
        className={styles.map}
        zoomControl={false} // We can add custom position if needed
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          // We use CartoDB Voyager tiles for a cleaner, modern look suitable for real estate
        />
        
        <MapEvents onBoundsChange={onBoundsChange} />
        {/* <FitBounds properties={properties} /> - Optional: remove if you want users to freely explore without snapping */}

        {properties.map(property => (
          <Marker 
            key={property.id}
            position={[property.location_lat, property.location_lng]}
            icon={createCustomIcon(property, activePropertyId === property.id)}
            eventHandlers={{
              click: () => onMarkerClick(property.id),
            }}
            zIndexOffset={activePropertyId === property.id ? 1000 : 0}
          >
            <Popup className={styles.popup}>
              <div className={styles.popupContent}>
                <div className={styles.popupTitle}>{property.title}</div>
                <div className={styles.popupPrice}>
                  {property.rent_amount ? `₹${property.rent_amount}/mo` : 'Price on request'}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
