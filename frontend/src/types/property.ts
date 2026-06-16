export interface Property {
  id: string;
  owner_id: string;
  title: string;
  description?: string;
  property_type: 'room' | 'flat' | 'pg' | 'studio';
  location_lat: number;
  location_lng: number;
  address_text?: string;
  city?: string;
  locality?: string;
  rent_amount?: number;
  deposit_amount?: number;
  total_capacity?: number;
  lifestyle_tags: string[];
  for_gender: 'male' | 'female' | 'any';
  token_percentage: number;
  status: 'draft' | 'pending_verification' | 'verified' | 'occupied' | 'delisted';
  created_at: string;
  updated_at: string;
}

export interface PropertySearchFilter {
  lat?: number;
  lng?: number;
  radius_km?: number;
  city?: string;
  locality?: string;
  min_rent?: number;
  max_rent?: number;
  property_type?: string;
  for_gender?: string;
  lifestyle_tags?: string[];
  page?: number;
  per_page?: number;
}

export interface PaginatedProperties {
  properties: Property[];
  meta: {
    page: number;
    per_page: number;
    total: number;
  };
}

export interface Room {
  id: string;
  property_id: string;
  room_number?: string;
  room_type: string;
  capacity: number;
  current_occupancy: number;
  rent_amount: number;
  deposit_amount?: number;
  status: string;
}
