'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { ArrowLeft, Search } from 'lucide-react'

type GenderFilter = 'Todos' | 'Dama' | 'Caballero' | 'Unisex'
type ItemsPerPage = 10 | 20 | 50 | 100

export default function RankingsPage() {
  const [rankings, setRankings] = useState<PerfumeMapping[]>([])
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [itemsPerPage, setItemsPerPage] = useState<ItemsPerPage>(10)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchRankings = async () => {
      const { data, error } = await supabase.from('perfume_mappings').select('*')

      if (error) {
        console.error(error)
      } else if (data) {
        // Ordenar por % de aprobación y luego por cantidad de votos
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

    fetchRankings()
  }, [])

  // Filtrado
  const filteredRankings = rankings.filter(item => {
    const matchesGender = genderFilter === 'Todos' || item.gender === genderFilter
    const matchesSearch =
      item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesGender && matchesSearch
  })

  // Aplicar límite de resultados
  const displayedRankings = filteredRankings.slice(0, itemsPerPage)

  const getApprovalRate = (likes: number = 0, dislikes: number = 0) => {
    const total = likes + dislikes
    if (total === 0) return 0
    return Math.round((likes / total) * 100)
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <a href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700">
            <ArrowLeft size={20} /> Volver
          </a>
          <h1 className="text-3xl font-bold">Rankings de Fragancias</h1>
        </div>

        {/* Buscador */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-5 top-3.5 text-zinc-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nombre o marca..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-zinc-300 rounded-3xl pl-12 pr-6 py-3 text-lg focus:border-[#20cbd4] outline-none"
          />
        </div>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          {/* Filtros de género */}
          <div className="flex flex-wrap gap-2">
            {(['Todos', 'Dama', 'Caballero', 'Unisex'] as const).map((gender) => (
              <button
                key={gender}
                onClick={() => setGenderFilter(gender)}
                className={`px-5 py-2 rounded-2xl text-sm font-medium transition-all ${
                  genderFilter === gender
                    ? 'bg-[#20cbd4] text-white'
                    : 'bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700'
                }`}
              >
                {gender}
              </button>
            ))}
          </div>

          {/* Selector de cantidad de resultados */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600">Mostrar:</span>
            {[10, 20, 50, 100].map((num) => (
              <button
                key={num}
                onClick={() => setItemsPerPage(num as ItemsPerPage)}
                className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all ${
                  itemsPerPage === num
                    ? 'bg-[#20cbd4] text-white'
                    : 'bg-white border border-zinc-300 hover:bg-zinc-50'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-zinc-500">Cargando rankings...</div>
        ) : displayedRankings.length === 0 ? (
          <div className="text-center py-12 text-zinc-500">No se encontraron resultados</div>
        ) : (
          <>
            {/* Grid de tarjetas cuadradas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {displayedRankings.map((item, index) => {
                const approval = getApprovalRate(item.likes, item.dislikes)
                const totalVotes = (item.likes || 0) + (item.dislikes || 0)

                return (
                  <div 
                    key={item.id} 
                    className="bg-white border border-zinc-200 rounded-3xl p-5 flex flex-col justify-between hover:shadow-md transition-all h-full"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="text-3xl font-bold text-zinc-300">#{index + 1}</div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-[#20cbd4]">{approval}%</div>
                          <div className="text-xs text-zinc-500">{totalVotes} votos</div>
                        </div>
                      </div>

                      <div className="font-semibold text-lg leading-tight mb-1">{item.original_name}</div>
                      {item.brand && <div className="text-sm text-zinc-500 mb-2">{item.brand}</div>}
                      <div className="font-mono text-[#20cbd4] text-sm">{item.fraiche_code}</div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-zinc-100 flex justify-between text-xs text-zinc-500">
                      <span>{item.gender || '—'}</span>
                      <span>{item.cost_per_gram ? `$${item.cost_per_gram}/g` : ''}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Información de resultados */}
            <div className="mt-8 text-center text-sm text-zinc-500">
              Mostrando <span className="font-semibold">{displayedRankings.length}</span> de{' '}
              <span className="font-semibold">{filteredRankings.length}</span> fragancias
              {filteredRankings.length > itemsPerPage && (
                <span> (usa el buscador o cambia el filtro para ver más)</span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}