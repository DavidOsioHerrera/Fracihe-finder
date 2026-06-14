'use client'

import { useState, useEffect, useRef } from 'react'
import Fuse from 'fuse.js'
import { Search, Copy, Plus, Filter, ThumbsUp, ThumbsDown, LogIn, LogOut, User } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { Toaster, toast } from 'sonner'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'

type GenderFilter = 'Todos' | 'Dama' | 'Caballero' | 'Unisex'

export default function FraicheFinder() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Todos')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    original_name: '',
    brand: '',
    fraiche_code: '',
    gender: 'Caballero' as 'Dama' | 'Caballero' | 'Unisex',
    cost_per_gram: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // === Infinite Query ===
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useInfiniteQuery({
    queryKey: ['fragrances-infinite', genderFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const from = pageParam * 10
      const to = from + 9

      let query = supabase
        .from('perfume_mappings')
        .select('*', { count: 'exact' })
        .order('original_name')

      if (genderFilter !== 'Todos') {
        query = query.eq('gender', genderFilter)
      }

      const { data, error, count } = await query.range(from, to)
      if (error) throw error

      return { data: data || [], count: count || 0 }
    },
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + page.data.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    enabled: searchTerm.length === 0,
  })

  const allFragrances = infiniteData?.pages.flatMap(page => page.data) || []
  const totalFragrances = infiniteData?.pages[0]?.count || 0

  // === User Votes Query ===
  const { data: userVotes = {} } = useQuery({
    queryKey: ['userVotes', user?.id],
    queryFn: async () => {
      if (!user) return {}
      const { data } = await supabase
        .from('fragrance_votes')
        .select('fragrance_id, vote_type')
        .eq('user_id', user.id)

      const votesMap: Record<string, 'like' | 'dislike'> = {}
      data?.forEach(v => {
        votesMap[v.fragrance_id] = v.vote_type as 'like' | 'dislike'
      })
      return votesMap
    },
    enabled: !!user,
  })

  // Si hay búsqueda → mostrar todos los resultados
  const displayedResults = searchTerm.length > 0 
    ? (() => {
        let filtered = allFragrances.length > 0 ? allFragrances : []
        if (genderFilter !== 'Todos') filtered = filtered.filter(m => m.gender === genderFilter)
        if (searchTerm) {
          const fuse = new Fuse(filtered, { keys: ['original_name', 'brand'], threshold: 0.35 })
          filtered = fuse.search(searchTerm).map(r => r.item)
        }
        return filtered
      })()
    : allFragrances

  // === Infinite Scroll ===
  useEffect(() => {
    if (searchTerm.length > 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    observerRef.current = observer

    return () => {
      if (observerRef.current) observerRef.current.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, searchTerm])

  // === Votación ===
  const voteMutation = useMutation({
    mutationFn: async ({ fragranceId, voteType }: { fragranceId: string; voteType: 'like' | 'dislike' }) => {
      if (!user) throw new Error('No autenticado')

      const currentVote = userVotes[fragranceId]

      if (currentVote === voteType) {
        await supabase.from('fragrance_votes').delete()
          .eq('user_id', user.id).eq('fragrance_id', fragranceId)

        const item = allFragrances.find(m => m.id === fragranceId)
        if (item) {
          const newLikes = voteType === 'like' ? Math.max(0, (item.likes || 0) - 1) : item.likes || 0
          const newDislikes = voteType === 'dislike' ? Math.max(0, (item.dislikes || 0) - 1) : item.dislikes || 0

          await supabase.from('perfume_mappings').update({ likes: newLikes, dislikes: newDislikes }).eq('id', fragranceId)
        }
        return { action: 'removed' }
      }

      if (currentVote) {
        await supabase.from('fragrance_votes').update({ vote_type: voteType })
          .eq('user_id', user.id).eq('fragrance_id', fragranceId)
      } else {
        await supabase.from('fragrance_votes').insert({
          user_id: user.id, fragrance_id: fragranceId, vote_type: voteType,
        })
      }

      const item = allFragrances.find(m => m.id === fragranceId)
      if (item) {
        let newLikes = item.likes || 0
        let newDislikes = item.dislikes || 0

        if (currentVote === 'like') newLikes = Math.max(0, newLikes - 1)
        if (currentVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1)

        if (voteType === 'like') newLikes++
        if (voteType === 'dislike') newDislikes++

        await supabase.from('perfume_mappings').update({ likes: newLikes, dislikes: newDislikes }).eq('id', fragranceId)
      }

      return { action: currentVote ? 'updated' : 'created' }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fragrances-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['userVotes', user?.id] })
    },
    onError: () => toast.error('Error al procesar tu voto'),
  })

  // Cargar usuario
  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', currentUser.id).single()
        setIsAdmin(profile?.is_admin || false)
      }
    }
    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', session.user.id).single()
        setIsAdmin(profile?.is_admin || false)
      } else {
        setIsAdmin(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Código ${code} copiado`)
  }

  const getApprovalRate = (likes = 0, dislikes = 0) => {
    const total = likes + dislikes
    return total === 0 ? 0 : Math.round((likes / total) * 100)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    toast.info('Sesión cerrada')
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Toaster position="top-center" richColors />

      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#20cbd4] rounded-2xl flex items-center justify-center">
              <span className="font-bold text-2xl text-white">F</span>
            </div>
            <div>
              <div className="font-bold text-2xl tracking-tight">Fraiche Finder</div>
              <div className="text-[10px] text-zinc-500 -mt-1">Códigos equivalentes</div>
            </div>
          </a>

          <div className="flex items-center gap-4">
            <a href="/rankings" className="px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-sm font-medium flex items-center gap-2">
              🏆 Rankings
            </a>

            {user && isAdmin && (
              <a href="/admin" className="px-5 py-2.5 rounded-2xl border border-zinc-300 hover:bg-zinc-100 text-sm font-medium">
                Panel Admin
              </a>
            )}

            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 flex items-center gap-1">
                  <User size={16} /> {user.email?.split('@')[0]}
                </span>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-sm">
                  <LogOut size={16} /> Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a href="/login" className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-sm flex items-center gap-2">
                  <LogIn size={16} /> Iniciar sesión
                </a>
                <a href="/signup" className="px-4 py-2 rounded-xl bg-[#20cbd4] text-white text-sm font-medium">
                  Registrarse
                </a>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-8 text-center">
        <h1 className="text-6xl font-bold tracking-tighter">Busca tu código Fraiche</h1>
        <p className="mt-4 text-xl text-zinc-600">Encuentra el equivalente de tus perfumes favoritos</p>
      </div>

      {/* Buscador + Filtros */}
      <div className="max-w-5xl mx-auto px-6 sticky top-0 bg-white z-50 pb-6 border-b border-zinc-100">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-4 text-zinc-400" size={20} />
            <input type="text" placeholder="Busca un perfume..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-3xl pl-12 pr-6 py-4 text-lg focus:border-[#20cbd4] outline-none" />
          </div>

          <div className="relative">
            <button onClick={() => setShowFilterMenu(!showFilterMenu)} className="flex items-center gap-2 px-5 py-4 rounded-3xl border border-zinc-300 hover:bg-zinc-50">
              <Filter size={18} /> Filtros
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-lg py-2 z-50">
                {(['Todos', 'Dama', 'Caballero', 'Unisex'] as const).map(g => (
                  <button key={g} onClick={() => { setGenderFilter(g); setShowFilterMenu(false) }} className={`w-full text-left px-5 py-2.5 text-sm hover:bg-zinc-50 ${genderFilter === g ? 'bg-zinc-100 font-medium' : ''}`}>
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-4 rounded-3xl bg-[#20cbd4] hover:bg-[#1bb8c2] text-white font-semibold">
            <Plus size={20} /> Sugerir
          </button>
        </div>
      </div>

      {/* Resultados */}
      <div className="max-w-5xl mx-auto px-6 pb-20 pt-4">
        {isPending ? (
          <div className="text-center py-16 text-zinc-500">Cargando...</div>
        ) : displayedResults.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-2xl text-zinc-500">No se encontraron resultados</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-2 gap-4">
              {displayedResults.map((item) => {
                const userVote = userVotes[item.id]
                const approval = getApprovalRate(item.likes, item.dislikes)

                return (
                  <div key={item.id} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="font-semibold text-2xl tracking-tight">{item.original_name}</div>
                        {item.brand && <div className="text-sm text-zinc-500">{item.brand}</div>}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {item.gender && <span className="px-3 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-600">{item.gender}</span>}
                        {item.cost_per_gram && <span className="px-3 py-0.5 text-xs rounded-full bg-[#e0f7fa] text-[#0e9aa8]">${item.cost_per_gram} /g</span>}
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-50 rounded-2xl p-5 mb-4">
                      <div>
                        <div className="text-xs text-zinc-500">CÓDIGO FRAICHE</div>
                        <div className="font-mono text-4xl font-bold text-[#20cbd4] tracking-tight">{item.fraiche_code}</div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button onClick={() => copyCode(item.fraiche_code)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-100 text-sm">
                          <Copy size={15} /> Copiar
                        </button>
                        {item.link && (
                          <a href={item.link} target="_blank" className="flex items-center justify-center px-4 py-2 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-100 text-sm">
                            Ver en Fraiche
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => voteMutation.mutate({ fragranceId: item.id, voteType: 'like' })}
                          disabled={!user}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${userVote === 'like' ? 'text-green-600 font-semibold' : 'hover:text-green-600'} ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsUp size={18} /> <span>{item.likes || 0}</span>
                        </button>
                        <button
                          onClick={() => voteMutation.mutate({ fragranceId: item.id, voteType: 'dislike' })}
                          disabled={!user}
                          className={`flex items-center gap-1.5 text-sm transition-colors ${userVote === 'dislike' ? 'text-red-600 font-semibold' : 'hover:text-red-600'} ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <ThumbsDown size={18} /> <span>{item.dislikes || 0}</span>
                        </button>
                      </div>
                      <div className="text-sm text-zinc-500">{approval}% aprobación</div>
                    </div>

                    {!user && <p className="text-xs text-zinc-400 mt-2">Inicia sesión para votar</p>}
                  </div>
                )
              })}
            </div>

            {/* Sentinel para Infinite Scroll */}
            {searchTerm.length === 0 && hasNextPage && (
              <div ref={loadMoreRef} className="h-10 flex justify-center items-center mt-8">
                {isFetchingNextPage && <p className="text-zinc-500">Cargando más fragancias...</p>}
              </div>
            )}

            {/* Leyenda */}
            <div className="mt-8 text-center text-tm text-zinc-500">
              {searchTerm.length > 0 ? (
                <>Se encontraron <span className="font-semibold">{displayedResults.length}</span> resultados.</>
              ) : (
                <>Mostrando <span className="font-semibold">{displayedResults.length}</span> de <span className="font-semibold">{totalFragrances}</span> fragancias.</>
              )}
            </div>
          </>
        )}
      </div>

      {/* Modal Sugerir */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-xl">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600">✕</button>
            <h2 className="text-2xl font-semibold mb-6 text-zinc-900">Sugerir nueva equivalencia</h2>
            <form onSubmit={(e) => { e.preventDefault(); setShowModal(false) }} className="space-y-4">
              <input type="text" placeholder="Nombre del perfume original *" value={formData.original_name} onChange={e => setFormData({ ...formData, original_name: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-2xl px-5 py-3.5" required />
              <input type="text" placeholder="Marca" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-2xl px-5 py-3.5" />
              <input type="text" placeholder="Código Fraiche *" value={formData.fraiche_code} onChange={e => setFormData({ ...formData, fraiche_code: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-2xl px-5 py-3.5 font-mono" required />
              <div className="grid grid-cols-2 gap-4">
                <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })} className="bg-white border border-zinc-300 rounded-2xl px-5 py-3.5">
                  <option value="Caballero">Caballero</option><option value="Dama">Dama</option><option value="Unisex">Unisex</option>
                </select>
                <input type="number" step="0.01" placeholder="Costo por gramo (opcional)" value={formData.cost_per_gram} onChange={e => setFormData({ ...formData, cost_per_gram: e.target.value })} className="bg-white border border-zinc-300 rounded-2xl px-5 py-3.5" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 mt-4 rounded-2xl bg-[#20cbd4] hover:bg-[#1bb8c2] text-white font-semibold disabled:opacity-70">
                Enviar sugerencia
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}