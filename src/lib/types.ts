

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
  tags: string[] | null;
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
  country_id: number | null;
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
    phone_code: string | null;
    slug: string | null;
};

export type Category = {
    id: number;
    name: string;
};

export type AdRating = {
    id: number;
    ad_id: number;
    user_id: string;
    rating: number;
    created_at: string;
};

export type AdComment = {
    id: number;
    ad_id: number;
    user_id: string;
    parent_comment_id: number | null;
    comment: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
};

// Type for joins, including related table data
export type AdWithRelations = Ad & {
  profiles: Pick<Profile, 'id'| 'username' | 'avatar_url' | 'contact_email' | 'contact_whatsapp' | 'contact_telegram' | 'contact_social_url'> & {
    country: Pick<Location, 'name' | 'phone_code'> | null;
  };
  categories: Pick<Category, 'name'> | null;
  country: Pick<Location, 'name'> | null;
  region: Pick<Location, 'name'> | null;
  subregion: Pick<Location, 'name'> | null;
  ad_media: Pick<AdMedia, 'id' | 'url' | 'is_cover' | 'type'>[] | null;
};

export type AdWithMedia = Ad & {
  ad_media: AdMedia[] | null;
};

export type AdForTable = Pick<Ad, 'id' | 'title' | 'created_at' | 'status' | 'slug' | 'boosted_until'> & {
  category: { name: string } | null;
};

export type AdForCard = Pick<Ad, 'id' | 'title' | 'slug' | 'tags' | 'boosted_until'> & {
  ad_media: { url: string }[];
  category: { name: string } | null;
  country: { name: string } | null;
  avg_rating?: number;
  rating_count?: number;
};

export type AdCommentWithProfile = AdComment & {
    profiles: Pick<Profile, 'username' | 'avatar_url'>
};


