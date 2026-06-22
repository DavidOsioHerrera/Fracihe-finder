'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { ArrowLeft, Search, ThumbsUp, ThumbsDown } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { voteOnFragrance } from '@/app/actions/vote'

export default function RankingsPage() {
  const supabase = createClient()
  const [rankings, setRankings] = useState<PerfumeMapping[]>([])
  const [genderFilter, setGenderFilter] = useState<'Todos' | 'Dama' | 'Caballero' | 'Unisex'>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userVotes, setUserVotes] = useState<Record<string, 'like' | 'dislike'>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      if (currentUser) {
        const { data } = await supabase.from('fragrance_votes').select('fragrance_id, vote_type').eq('user_id', currentUser.id)
        const votesMap: Record<string, 'like' | 'dislike'> = {}
        data?.forEach(v => { votesMap[v.fragrance_id] = v.vote_type as 'like' | 'dislike' })
        setUserVotes(votesMap)
      }
    }
    getUser()
  }, [])

  const fetchRankings = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('perfume_mappings').select('*')
    if (error) toast.error('Error al cargar rankings')
    else if (data) {
      const sorted = [...data].sort((a, b) => {
        const aTotal = (a.likes || 0) + (a.dislikes || 0)
        const bTotal = (b.likes || 0) + (b.dislikes || 0)
        const aRate = aTotal > 0 ? (a.likes || 0) / aTotal : 0
        const bRate = bTotal > 0 ? (b.likes || 0) / bTotal : 0
        if (bRate !== aRate) return bRate - aRate
        return bTotal - aTotal
      })
      setRankings(sorted)
    }
    setLoading(false)
  }

  useEffect(() => { fetchRankings() }, [])

  const filteredRankings = rankings.filter(item => {
    const matchesGender = genderFilter === 'Todos' || item.gender === genderFilter
    const matchesSearch = item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.fraiche_code.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesGender && matchesSearch
  })

  const totalPages = Math.ceil(filteredRankings.length / itemsPerPage)
  const paginatedRankings = filteredRankings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  useEffect(() => { setCurrentPage(1) }, [searchTerm, genderFilter])

  const handleVote = async (fragranceId: string, voteType: 'like' | 'dislike') => {
    if (!user) return toast.error('Debes iniciar sesión para votar')
    try {
      await voteOnFragrance(fragranceId, voteType)
      toast.success('Voto registrado')
      setUserVotes(prev => ({ ...prev, [fragranceId]: voteType }))
      fetchRankings()
    } catch (error: any) {
      toast.error(error.message || 'Error al votar')
    }
  }

  const getApprovalRate = (likes?: number | null, dislikes?: number | null) => {
	  const l = likes ?? 0;
	  const d = dislikes ?? 0;
	  const total = l + d;
	  if (total === 0) return 0;
	  return Math.round((l / total) * 100);
	}

  const getGenderBadge = (gender: string) => {
    if (gender === 'Caballero') return <span className="px-3 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-medium">Caballero</span>
    if (gender === 'Dama') return <span className="px-3 py-0.5 text-xs rounded-full bg-pink-100 text-pink-700 font-medium">Dama</span>
    return <span className="px-3 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700 font-medium">Unisex</span>
  }

  const getCategoryBadge = (category: string) => {
    if (category === 'niche') return <span className="px-3 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 font-medium">Niche</span>
    if (category === 'arabe') return <span className="px-3 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 font-medium">Árabe</span>
    return <span className="px-3 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-700 font-medium">Normal</span>
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Toaster position="top-center" richColors />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <a href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700"><ArrowLeft size={20} /> Volver al inicio</a>
          <h1 className="text-3xl font-bold">Rankings de Fragancias</h1>
        </div>

        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-5 top-3.5 text-zinc-400" size={20} />
          <input type="text" placeholder="Buscar por nombre, marca o código..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-white border border-zinc-300 rounded-3xl pl-12 pr-6 py-3 text-lg focus:border-[#20cbd4] outline-none" />
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {(['Todos', 'Dama', 'Caballero', 'Unisex'] as const).map((gender) => (
            <button key={gender} onClick={() => setGenderFilter(gender)} className={`px-5 py-2 rounded-2xl text-sm font-medium transition-all ${genderFilter === gender ? 'bg-[#20cbd4] text-white' : 'bg-white border border-zinc-300 hover:bg-zinc-50'}`}>{gender}</button>
          ))}
        </div>

        <div className="mb-4 text-sm text-zinc-600">Total de fragancias: <span className="font-semibold">{rankings.length}</span></div>

        {loading ? <div className="text-center py-12 text-zinc-500">Cargando rankings...</div> : paginatedRankings.length === 0 ? <div className="text-center py-12 text-zinc-500">No se encontraron resultados</div> : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginatedRankings.map((item, index) => {
                const globalIndex = (currentPage - 1) * itemsPerPage + index + 1
                const approval = getApprovalRate(item.likes, item.dislikes)
                const totalVotes = (item.likes || 0) + (item.dislikes || 0)
                const userVote = userVotes[item.id]

                return (
                  <div key={item.id} className="bg-white border border-zinc-200 rounded-3xl p-6 flex flex-col justify-between hover:shadow-md transition-all">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="text-sm text-zinc-400">#{globalIndex}</div>
                          <div className="font-semibold text-xl leading-tight">{item.original_name}</div>
                          {item.brand && <div className="text-sm text-zinc-500">{item.brand}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#20cbd4]">{approval}%</div>
                          <div className="text-xs text-zinc-500">{totalVotes} votos</div>
                        </div>
                      </div>
                      <div className="font-mono text-[#20cbd4] text-sm mb-4">{item.fraiche_code}</div>
                    </div>

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-100">
                      <div className="flex items-center gap-3">
                        <button onClick={() => handleVote(item.id, 'like')} disabled={!user} className={`flex items-center gap-1.5 text-sm transition-colors ${userVote === 'like' ? 'text-green-600 font-semibold' : 'hover:text-green-600'} ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}><ThumbsUp size={17} /> {item.likes || 0}</button>
                        <button onClick={() => handleVote(item.id, 'dislike')} disabled={!user} className={`flex items-center gap-1.5 text-sm transition-colors ${userVote === 'dislike' ? 'text-red-600 font-semibold' : 'hover:text-red-600'} ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}><ThumbsDown size={17} /> {item.dislikes || 0}</button>
                      </div>
                      <div className="text-xs text-zinc-500 flex flex-col items-end gap-1">
                        {item.gender && getGenderBadge(item.gender)}
                        {item.category && getCategoryBadge(item.category)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-10">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 rounded-xl border border-zinc-300 disabled:opacity-50">Anterior</button>
                <span className="text-sm text-zinc-600">Página {currentPage} de {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 rounded-xl border border-zinc-300 disabled:opacity-50">Siguiente</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}