
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
  image_url: string | null;
  video_url: string | null;
  boosted_until: string | null;
  slug: string | null;
};

export type Location = {
    id: number;
    name: string;
    type: 'country' | 'region' | 'subregion';
    parent_id: number | null;
    code: string | null;
};

export type AdForTable = {
    id: number;
    title: string;
    created_at: string;
    status: 'active' | 'inactive' | 'draft' | 'expired';
    category?: { name: string };
};
