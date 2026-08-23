export type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "member" | "admin";
  created_at: string;
};

export type Couple = {
  id: string;
  name: string;
  quest_mode: "couple_duo" | "solo_foodie";
  created_by: string | null;
  created_at: string;
};

export type CoupleMember = {
  couple_id: string;
  user_id: string;
  partner_label: string;
  joined_at: string;
  profile?: Profile;
};

export type Hub = {
  id: string;
  couple_id: string;
  label: string;
  address: string;
  lat: number;
  lng: number;
  city: string | null;
  state: string | null;
  radius_miles: number;
  hub_type: "primary" | "vacation" | "work" | "other";
  is_active: boolean;
  created_at: string;
};

export type Restaurant = {
  id: string;
  hub_id: string;
  name: string;
  tagline: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  lat: number | null;
  lng: number | null;
  google_place_id: string | null;
  rating: number | null;
  review_count: number | null;
  price_level: number | null;
  cuisines: string[];
  signature_dishes: string[];
  photo_url: string | null;
  phone: string | null;
  description: string | null;
  source: "places" | "manual" | "ai";
  meal_type: "coffee_breakfast" | "lunch" | "dinner" | null;
  created_at: string;
  distance_mi?: number;
};

export type RestaurantFlag = {
  couple_id: string;
  restaurant_id: string;
  wishlisted: boolean;
};

export type Visit = {
  id: string;
  restaurant_id: string;
  couple_id: string;
  hub_id: string | null;
  visited_date: string;
  occasion: string | null;
  would_return: "yes" | "maybe" | "no" | null;
  dishes_ordered: string[];
  drinks: string[];
  seating_notes: string | null;
  memories: string | null;
  photo_url: string | null;
  bill_total: number | null;
  created_by: string | null;
  created_at: string;
  restaurant?: Restaurant;
  ratings?: Rating[];
};

export type Rating = {
  id: string;
  visit_id: string;
  user_id: string;
  score: number;
};

export type Badge = {
  id: string;
  code: string;
  label: string;
  description: string;
  icon: string;
  target: number;
  category: string | null;
};

export type CoupleBadge = {
  couple_id: string;
  badge_id: string;
  progress: number;
  unlocked_at: string | null;
};

export type CrewLink = {
  id: string;
  owner_couple_id: string;
  crew_name: string;
  member_names: string | null;
  attending_tonight: boolean;
};

export type AdSettings = {
  enabled: boolean;
  publisher_id: string | null;
  slot_sidebar: string | null;
  slot_footer: string | null;
  slot_infeed: string | null;
};
