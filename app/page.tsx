'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Fuse from 'fuse.js'
import { Search, Copy, Plus, ThumbsUp, ThumbsDown, LogIn, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { Toaster, toast } from 'sonner'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { voteOnFragrance } from '@/app/actions/vote'

type GenderFilter = 'Todos' | 'Dama' | 'Caballero' | 'Unisex'

export default function FraicheFinder() {
	const supabase = createClient()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Todos')
  const [brandFilter, setBrandFilter] = useState<string>('Todas')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    original_name: '',
    brand: '',
    fraiche_code: '',
    gender: 'Caballero' as 'Dama' | 'Caballero' | 'Unisex',
    category: 'normal' as 'normal' | 'niche' | 'arabe',
  })
  const [submitting, setSubmitting] = useState(false)

  const observerRef = useRef<IntersectionObserver | null>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  // Infinite Query
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
      let query = supabase.from('perfume_mappings').select('*', { count: 'exact' }).order('original_name')
      if (genderFilter !== 'Todos') query = query.eq('gender', genderFilter)
      const { data, error, count } = await query.range(from, to)
      if (error) throw error
      return { data: data || [], count: count || 0 }
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((acc, page) => acc + page.data.length, 0)
      return loaded < lastPage.count ? allPages.length : undefined
    },
    enabled: searchTerm.length === 0,
  })

  const allFragrances = infiniteData?.pages.flatMap(page => page.data) || []
  const totalFragrances = infiniteData?.pages[0]?.count || 0

  const { data: searchData = [] } = useQuery({
    queryKey: ['all-fragrances-search'],
    queryFn: async () => {
      const { data, error } = await supabase.from('perfume_mappings').select('*').order('original_name')
      if (error) throw error
      return data || []
    },
    enabled: searchTerm.length > 0,
  })

  const uniqueBrands = Array.from(new Set(allFragrances.map(item => item.brand).filter(Boolean))).sort()

  const { data: userVotes = {} } = useQuery({
    queryKey: ['userVotes', user?.id],
    queryFn: async () => {
      if (!user) return {}
      const { data } = await supabase.from('fragrance_votes').select('fragrance_id, vote_type').eq('user_id', user.id)
      const map: Record<string, 'like' | 'dislike'> = {}
      data?.forEach(v => { map[v.fragrance_id] = v.vote_type })
      return map
    },
    enabled: !!user,
  })

  // Fuse.js
  const dataForSearch = searchTerm.length > 0 ? searchData : allFragrances
  const fuseIndex = useMemo(() => Fuse.createIndex(['original_name', 'brand', 'fraiche_code'], dataForSearch), [dataForSearch])
  const fuse = useMemo(() => new Fuse(dataForSearch, { keys: ['original_name', 'brand', 'fraiche_code'], threshold: 0.35, minMatchCharLength: 2 }, fuseIndex), [dataForSearch, fuseIndex])

  const filteredResults = useMemo(() => {
    let results = searchTerm.length > 0 ? searchData : allFragrances
    if (genderFilter !== 'Todos') results = results.filter(m => m.gender === genderFilter)
    if (brandFilter !== 'Todas') results = results.filter(m => m.brand === brandFilter)
    if (searchTerm.length > 1) return fuse.search(searchTerm).map(r => r.item)
    return results
  }, [searchTerm, genderFilter, brandFilter, searchData, allFragrances, fuse])

  const totalPages = Math.ceil(filteredResults.length / itemsPerPage)
  const paginatedResults = searchTerm.length > 0 ? filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : filteredResults
  const displayedResults = searchTerm.length > 0 ? paginatedResults : filteredResults

  useEffect(() => { setCurrentPage(1) }, [searchTerm, genderFilter, brandFilter])

  // Infinite Scroll
  useEffect(() => {
    if (searchTerm.length > 0) return
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage()
    }, { threshold: 0.1 })
    if (loadMoreRef.current) observer.observe(loadMoreRef.current)
    observerRef.current = observer
    return () => observerRef.current?.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, searchTerm])

  const handleVote = async (fragranceId: string, voteType: 'like' | 'dislike') => {
    if (!user) return toast.error('Debes iniciar sesión para votar')
    try {
      await voteOnFragrance(fragranceId, voteType)
      toast.success('Voto registrado')
      queryClient.invalidateQueries({ queryKey: ['userVotes', user?.id] })
      queryClient.invalidateQueries({ queryKey: ['fragrances-infinite'] })
    } catch (error: any) {
      toast.error(error.message || 'Error al votar')
    }
  }

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
  }, [])

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success(`Código ${code} copiado`) }
  const getApprovalRate = (likes = 0, dislikes = 0) => { const total = likes + dislikes; return total === 0 ? 0 : Math.round((likes / total) * 100) }
  const handleLogout = async () => { await supabase.auth.signOut(); setUser(null); setIsAdmin(false); toast.info('Sesión cerrada') }
  const clearFilters = () => { setGenderFilter('Todos'); setBrandFilter('Todas') }

  const getGenderBadge = (gender: string) => {
    if (gender === 'Caballero') return <span className="px-3 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">Caballero</span>
    if (gender === 'Dama') return <span className="px-3 py-0.5 text-xs rounded-full bg-pink-100 text-pink-700 font-medium">Dama</span>
    return <span className="px-3 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">Unisex</span>
  }

  const getCategoryBadge = (category: string) => {
    if (category === 'niche') return <span className="px-3 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">Niche</span>
    if (category === 'arabe') return <span className="px-3 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">Árabe</span>
    return <span className="px-3 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-700 font-medium">Serie Normal</span>
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Toaster position="top-center" richColors />

      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#20cbd4] rounded-2xl flex items-center justify-center"><span className="font-bold text-2xl text-white">F</span></div>
            <div><div className="font-bold text-2xl tracking-tight">Fraiche Finder</div><div className="text-[10px] text-zinc-500 -mt-1">Códigos equivalentes</div></div>
          </a>
          <div className="flex items-center gap-4">
            <a href="/rankings" className="px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-sm font-medium flex items-center gap-2">🏆 Rankings</a>
            {user && isAdmin && <a href="/admin" className="px-5 py-2.5 rounded-2xl border border-zinc-300 hover:bg-zinc-100 text-sm font-medium">Panel Admin</a>}
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-600 flex items-center gap-1"><User size={16} /> {user.email?.split('@')[0]}</span>
                <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-sm"><LogOut size={16} /> Salir</button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <a href="/login" className="px-4 py-2 rounded-xl border border-zinc-300 hover:bg-zinc-50 text-sm flex items-center gap-2"><LogIn size={16} /> Iniciar sesión</a>
                <a href="/signup" className="px-4 py-2 rounded-xl bg-[#20cbd4] text-white text-sm font-medium">Registrarse</a>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 pt-14 pb-8 text-center">
        <h1 className="text-6xl font-bold tracking-tighter">Busca tu código Fraiche</h1>
        <p className="mt-4 text-xl text-zinc-600">Encuentra el equivalente de tus perfumes favoritos</p>
      </div>

      <div className="max-w-5xl mx-auto px-6 sticky top-0 bg-white z-50 pb-6 border-b border-zinc-100">
        <div className="flex gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-4 text-zinc-400" size={20} />
            <input type="text" placeholder="Busca un perfume..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-3xl pl-12 pr-6 py-4 text-lg focus:border-[#20cbd4] outline-none" />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-4 rounded-3xl bg-[#20cbd4] hover:bg-[#1bb8c2] text-white font-semibold"><Plus size={20} /> Sugerir</button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1 ml-1">Género</label>
            <select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value as GenderFilter)} className="w-full bg-white border border-zinc-300 rounded-2xl px-4 py-3 text-sm focus:border-[#20cbd4] outline-none">
              <option value="Todos">Todos</option><option value="Dama">Dama</option><option value="Caballero">Caballero</option><option value="Unisex">Unisex</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-zinc-500 mb-1 ml-1">Marca</label>
            <select value={brandFilter} onChange={(e) => setBrandFilter(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-2xl px-4 py-3 text-sm focus:border-[#20cbd4] outline-none">
              <option value="Todas">Todas las marcas</option>
              {uniqueBrands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
            </select>
          </div>
          {(genderFilter !== 'Todos' || brandFilter !== 'Todas') && <button onClick={clearFilters} className="px-5 h-[50px] mt-auto rounded-2xl border border-zinc-300 text-sm font-medium hover:bg-zinc-50 transition-colors whitespace-nowrap self-end">Limpiar filtros</button>}
        </div>

        {!isPending && displayedResults.length > 0 && <div className="mt-3 ml-1 text-sm text-zinc-500">{searchTerm.length > 0 ? `Se encontraron ${filteredResults.length} resultados` : `Mostrando ${displayedResults.length} de ${totalFragrances} fragancias`}</div>}
      </div>

      <div className="max-w-5xl mx-auto px-6 pb-20 pt-4">
        {(isPending || (searchTerm.length > 0 && searchData.length === 0 && searchTerm.length > 1)) ? (
          <div className="text-center py-16 text-zinc-500">Cargando...</div>
        ) : displayedResults.length === 0 ? (
          <div className="text-center py-16"><p className="text-2xl text-zinc-500">No se encontraron resultados</p></div>
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
                        {item.gender && getGenderBadge(item.gender)}
                        {item.category && getCategoryBadge(item.category)}
                      </div>
                    </div>

                    <div className="flex justify-between items-center bg-zinc-50 rounded-2xl p-5 mb-4">
                      <div>
                        <div className="text-xs text-zinc-500">CÓDIGO FRAICHE</div>
                        <div className="font-mono text-4xl font-bold text-[#20cbd4] tracking-tight">{item.fraiche_code}</div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button onClick={() => copyCode(item.fraiche_code)} className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-100 text-sm"><Copy size={15} /> Copiar</button>
                        {item.link && <a href={item.link} target="_blank" className="flex items-center justify-center px-4 py-2 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-100 text-sm">Ver en Fraiche</a>}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleVote(item.id, 'like')} disabled={!user} className={`flex items-center gap-1.5 text-sm transition-colors ${userVote === 'like' ? 'text-green-600 font-semibold' : 'hover:text-green-600'} ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}><ThumbsUp size={18} /> <span>{item.likes || 0}</span></button>
                        <button onClick={() => handleVote(item.id, 'dislike')} disabled={!user} className={`flex items-center gap-1.5 text-sm transition-colors ${userVote === 'dislike' ? 'text-red-600 font-semibold' : 'hover:text-red-600'} ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}><ThumbsDown size={18} /> <span>{item.dislikes || 0}</span></button>
                      </div>
                      <div className="text-sm text-zinc-500">{approval}% aprobación</div>
                    </div>
                    {!user && <p className="text-xs text-zinc-400 mt-2">Inicia sesión para votar</p>}
                  </div>
                )
              })}
            </div>

            {searchTerm.length > 0 && totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-xl border border-zinc-300 disabled:opacity-50">Anterior</button>
                <span className="text-sm text-zinc-600">Página {currentPage} de {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-xl border border-zinc-300 disabled:opacity-50">Siguiente</button>
              </div>
            )}

            {searchTerm.length === 0 && hasNextPage && (
              <div ref={loadMoreRef} className="h-10 flex justify-center items-center mt-8">
                {isFetchingNextPage && <p className="text-zinc-500">Cargando más fragancias...</p>}
              </div>
            )}
          </>
        )}
      </div>

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
                <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })} className="bg-white border border-zinc-300 rounded-2xl px-5 py-3.5"><option value="Caballero">Caballero</option><option value="Dama">Dama</option><option value="Unisex">Unisex</option></select>
                <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value as any })} className="bg-white border border-zinc-300 rounded-2xl px-5 py-3.5"><option value="normal">Normal</option><option value="niche">Niche</option><option value="arabe">Árabe</option></select>
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 mt-4 rounded-2xl bg-[#20cbd4] hover:bg-[#1bb8c2] text-white font-semibold disabled:opacity-70">Enviar sugerencia</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}