// Core type definitions for the app
export interface User {
  id: string;
  email: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  push_token?: string;
  created_at: string;
  updated_at: string;
}

export interface Cuisine {
  id: number;
  name: string;
  category: string;
  emoji?: string;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  restaurant_name: string;
  cuisine_id?: number; // Optional since we now also have cuisine as text
  cuisine?: string | Cuisine; // Can be text name or populated cuisine object
  rating?: number;
  review_text?: string;
  location_name?: string;
  location_coords?: [number, number];
  location?: any; // JSON location data
  dining_type?: 'fine_dining' | 'casual' | 'fast_food' | 'street_food' | 'home_cooking';
  photo_urls: string[]; // Updated to match schema
  is_private: boolean;
  created_at: string;
  updated_at: string;
  // Populated fields
  user?: User;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface UserCuisineProgress {
  id: string;
  user_id: string;
  cuisine_id: number;
  first_tried_at: string;
  times_tried: number;
  favorite_restaurant?: string;
  cuisine?: Cuisine;
}

export interface AuthState {
  user: User | null;
  session: any | null;
  loading: boolean;
}