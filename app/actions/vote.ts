'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

// =====================================================
// Rate Limiting (máximo 10 votos por minuto por usuario)
// =====================================================
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(userId: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(userId)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (record.count >= limit) {
    return false
  }

  record.count++
  return true
}

// =====================================================
// VOTAR EN UNA FRAGANCIA
// =====================================================
export async function voteOnFragrance(fragranceId: string, voteType: 'like' | 'dislike') {
  try {
    const supabase = await createClient()

    // 1. Verificar que el usuario esté autenticado
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      throw new Error('Debes iniciar sesión para votar')
    }

    // 2. Rate Limiting
    if (!checkRateLimit(user.id)) {
      throw new Error('Estás votando demasiado rápido. Espera unos segundos.')
    }

    // 3. Obtener el voto actual del usuario (si existe)
    const { data: existingVote } = await supabase
      .from('fragrance_votes')
      .select('vote_type')
      .eq('user_id', user.id)
      .eq('fragrance_id', fragranceId)
      .single()

    const currentVote = existingVote?.vote_type

    // 4. Si hace clic en el mismo voto → eliminarlo
    if (currentVote === voteType) {
      const { error: deleteError } = await supabase
        .from('fragrance_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('fragrance_id', fragranceId)

      if (deleteError) throw new Error('Error al eliminar el voto')

      // Actualizar contadores
      await updateVoteCounts(supabase, fragranceId, currentVote, null)
      
      revalidatePath('/')
      revalidatePath('/rankings')
      return { success: true, message: 'Voto eliminado' }
    }

    // 5. Si ya tenía un voto diferente → actualizarlo
    if (currentVote) {
      const { error: updateError } = await supabase
        .from('fragrance_votes')
        .update({ vote_type: voteType })
        .eq('user_id', user.id)
        .eq('fragrance_id', fragranceId)

      if (updateError) throw new Error('Error al cambiar el voto')

      await updateVoteCounts(supabase, fragranceId, currentVote, voteType)
    } 
    // 6. Si no tenía voto → crearlo
    else {
      const { error: insertError } = await supabase
        .from('fragrance_votes')
        .insert({
          user_id: user.id,
          fragrance_id: fragranceId,
          vote_type: voteType,
        })

      if (insertError) throw new Error('Error al registrar el voto')

      await updateVoteCounts(supabase, fragranceId, null, voteType)
    }

    revalidatePath('/')
    revalidatePath('/rankings')

    return { success: true, message: 'Voto registrado correctamente' }

  } catch (error: any) {
    console.error('Error en voteOnFragrance:', error)
    throw new Error(error.message || 'Ocurrió un error al procesar tu voto')
  }
}

// =====================================================
// Función auxiliar para actualizar contadores
// =====================================================
async function updateVoteCounts(
  supabase: any, 
  fragranceId: string, 
  previousVote: 'like' | 'dislike' | null, 
  newVote: 'like' | 'dislike' | null
) {
  const { data: fragrance, error } = await supabase
    .from('perfume_mappings')
    .select('likes, dislikes')
    .eq('id', fragranceId)
    .single()

  if (error || !fragrance) return

  let newLikes = fragrance.likes || 0
  let newDislikes = fragrance.dislikes || 0

  // Restar voto anterior
  if (previousVote === 'like') newLikes = Math.max(0, newLikes - 1)
  if (previousVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1)

  // Sumar nuevo voto
  if (newVote === 'like') newLikes++
  if (newVote === 'dislike') newDislikes++

  await supabase
    .from('perfume_mappings')
    .update({ likes: newLikes, dislikes: newDislikes })
    .eq('id', fragranceId)
}