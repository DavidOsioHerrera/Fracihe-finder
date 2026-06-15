'use server'

import { createClient } from '@/lib/supabase-server'
import { ratelimit } from '@/lib/rate-limit'
import { revalidatePath } from 'next/cache'

// =====================================================
// VOTAR EN UNA FRAGANCIA (Like / Dislike)
// =====================================================
export async function voteOnFragrance(fragranceId: string, voteType: 'like' | 'dislike') {
  try {
    const supabase = await createClient()

    // 1. Verificar que el usuario esté autenticado
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      throw new Error('Debes iniciar sesión para votar')
    }

    // 2. Rate Limiting con Upstash (máximo 10 votos por minuto)
    const { success } = await ratelimit.limit(`vote:${user.id}`)

    if (!success) {
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

    // 4. Si hace clic en el mismo voto → eliminar el voto
    if (currentVote === voteType) {
      await supabase
        .from('fragrance_votes')
        .delete()
        .eq('user_id', user.id)
        .eq('fragrance_id', fragranceId)

      await updateVoteCounts(supabase, fragranceId, currentVote, null)

      revalidatePath('/')
      revalidatePath('/rankings')
      return { success: true, action: 'removed' }
    }

    // 5. Si ya tenía voto diferente → actualizarlo, o crear nuevo voto
    if (currentVote) {
      await supabase
        .from('fragrance_votes')
        .update({ vote_type: voteType })
        .eq('user_id', user.id)
        .eq('fragrance_id', fragranceId)
    } else {
      await supabase.from('fragrance_votes').insert({
        user_id: user.id,
        fragrance_id: fragranceId,
        vote_type: voteType,
      })
    }

    // 6. Actualizar contadores de likes/dislikes
    await updateVoteCounts(supabase, fragranceId, currentVote, voteType)

    revalidatePath('/')
    revalidatePath('/rankings')

    return { success: true, action: currentVote ? 'updated' : 'created' }

  } catch (error: any) {
    console.error('Error en voteOnFragrance:', error)
    throw new Error(error.message || 'Error al procesar tu voto')
  }
}

// =====================================================
// Función auxiliar para actualizar likes y dislikes
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

  // Restar el voto anterior (si existía)
  if (previousVote === 'like') newLikes = Math.max(0, newLikes - 1)
  if (previousVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1)

  // Sumar el nuevo voto
  if (newVote === 'like') newLikes++
  if (newVote === 'dislike') newDislikes++

  await supabase
    .from('perfume_mappings')
    .update({ likes: newLikes, dislikes: newDislikes })
    .eq('id', fragranceId)
}