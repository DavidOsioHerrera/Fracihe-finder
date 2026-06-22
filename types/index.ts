export interface PerfumeMapping {
  id: string;
  original_name: string;
  brand?: string | null;
  fraiche_code: string;
  gender?: 'Dama' | 'Caballero' | 'Unisex' | null;
  category?: 'normal' | 'niche' | 'arabe' | null;   // ← Nueva columna
  link?: string | null;
  is_verified?: boolean;
  likes?: number | null;
  dislikes?: number | null;
  created_at?: string;
}