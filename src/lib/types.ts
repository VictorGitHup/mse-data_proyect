
export type Ad = {
  id: number;
  user_id: string;
  title: string;
  description: string;
  category_id: number;
  country_id: number | null;
  region_id: number | null;
  subregion_id: number | null;
  status: "active" | "inactive" | "draft" | "expired";
  created_at: string;
  updated_at: string | null;
  boosted_until: string | null;
  slug: string;
};

export type AdMedia = {
  id: number;
  ad_id: number;
  user_id: string;
  url: string;
  type: 'image' | 'video';
  is_cover: boolean;
  created_at: string;
}

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  role: "USER" | "ADVERTISER";
  full_name: string | null;
  contact_email: string | null;
  contact_whatsapp: string | null;
  contact_telegram: string | null;
  contact_social_url: string | null;
};

export type Location = {
    id: number;
    name: string;
    type: 'country' | 'region' | 'subregion';
    parent_id: number | null;
    code: string | null;
};

export type Category = {
    id: number;
    name: string;
};

// Type for joins, including related table data
export type AdWithRelations = Ad & {
  profiles: Pick<Profile, 'username' | 'avatar_url' | 'contact_email' | 'contact_whatsapp' | 'contact_telegram' | 'contact_social_url'>;
  categories: Pick<Category, 'name'> | null;
  country: Pick<Location, 'name'> | null;
  region: Pick<Location, 'name'> | null;
  subregion: Pick<Location, 'name'> | null;
  ad_media: Pick<AdMedia, 'id' | 'url' | 'is_cover' | 'type'>[] | null;
};

export type AdWithMedia = Ad & {
  ad_media: AdMedia[] | null;
};

export type AdForTable = Pick<Ad, 'id' | 'title' | 'created_at' | 'status' | 'slug'> & {
  category: { name: string } | null;
};

export type AdForCard = Pick<Ad, 'id' | 'title' | 'slug'> & {
  ad_media: { url: string }[];
  category: { name: string } | null;
  country: { name: string } | null;
};
