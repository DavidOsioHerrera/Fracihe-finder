export interface PerfumeMapping {
  id: string
  original_name: string
  brand: string | null
  fraiche_code: string
  gender: 'Dama' | 'Caballero' | 'Unisex' | null
  cost_per_gram: number | null          // ← Nuevo campo
  link: string
  is_verified: boolean
  created_at: string
}