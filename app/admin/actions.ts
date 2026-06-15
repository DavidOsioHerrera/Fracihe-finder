'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// =====================================================
// Verificar si el usuario es administrador
// =====================================================
async function isAdmin() {
  const supabase = await createClient()                    // ← Agregado await
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return false

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_admin === true
}

// =====================================================
// CREAR NUEVA FRAGANCIA
// =====================================================
export async function createFragrance(formData: FormData) {
  if (!(await isAdmin())) {
    throw new Error('No tienes permisos de administrador')
  }

  const supabase = await createClient()                    // ← Agregado await

  const { error } = await supabase.from('perfume_mappings').insert({
    original_name: formData.get('original_name') as string,
    brand: formData.get('brand') as string || null,
    fraiche_code: formData.get('fraiche_code') as string,
    gender: formData.get('gender') as string,
    cost_per_gram: formData.get('cost_per_gram') 
      ? parseFloat(formData.get('cost_per_gram') as string) 
      : null,
    link: formData.get('link') as string || null,
    is_verified: true,
  })

  if (error) throw new Error('Error al crear la fragancia')

  revalidatePath('/admin')
}

// =====================================================
// ACTUALIZAR FRAGANCIA
// =====================================================
export async function updateFragrance(id: string, formData: FormData) {
  if (!(await isAdmin())) {
    throw new Error('No tienes permisos de administrador')
  }

  const supabase = await createClient()                    // ← Agregado await

  const { error } = await supabase
    .from('perfume_mappings')
    .update({
      original_name: formData.get('original_name') as string,
      brand: formData.get('brand') as string || null,
      fraiche_code: formData.get('fraiche_code') as string,
      gender: formData.get('gender') as string,
      cost_per_gram: formData.get('cost_per_gram') 
        ? parseFloat(formData.get('cost_per_gram') as string) 
        : null,
      link: formData.get('link') as string || null,
    })
    .eq('id', id)

  if (error) throw new Error('Error al actualizar la fragancia')

  revalidatePath('/admin')
}

// =====================================================
// ELIMINAR FRAGANCIA
// =====================================================
export async function deleteFragrance(id: string) {
  if (!(await isAdmin())) {
    throw new Error('No tienes permisos de administrador')
  }

  const supabase = await createClient()                    // ← Agregado await

  const { error } = await supabase
    .from('perfume_mappings')
    .delete()
    .eq('id', id)

  if (error) throw new Error('Error al eliminar la fragancia')

  revalidatePath('/admin')
}

// =====================================================
// VERIFICAR FRAGANCIA
// =====================================================
export async function verifyFragrance(id: string) {
  if (!(await isAdmin())) {
    throw new Error('No tienes permisos de administrador')
  }

  const supabase = await createClient()                    // ← Agregado await

  const { error } = await supabase
    .from('perfume_mappings')
    .update({ is_verified: true })
    .eq('id', id)

  if (error) throw new Error('Error al verificar la fragancia')

  revalidatePath('/admin')
}