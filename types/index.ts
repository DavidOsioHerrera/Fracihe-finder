export interface PerfumeMapping {
  id: string;
  original_name: string;
  brand?: string | null;
  fraiche_code: string;
  gender?: 'Dama' | 'Caballero' | 'Unisex' | null;
  cost_per_gram?: number | null;
  link?: string | null;
  is_verified?: boolean;
  likes?: number | null;        // ← Agregado
  dislikes?: number | null;     // ← Agregado
  created_at?: string;
}