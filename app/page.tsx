'use client'

import { useState, useEffect } from 'react'
import Fuse from 'fuse.js'
import { Search, Copy, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { Toaster, toast } from 'sonner'

type GenderFilter = 'Todos' | 'Dama' | 'Caballero' | 'Unisex'

export default function FraicheFinder() {
  const [mappings, setMappings] = useState<PerfumeMapping[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Todos')
  const [results, setResults] = useState<PerfumeMapping[]>([])
  const [loading, setLoading] = useState(true)

  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    original_name: '',
    brand: '',
    fraiche_code: '',
    gender: 'Caballero' as 'Dama' | 'Caballero' | 'Unisex',
    cost_per_gram: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const [showDuplicateModal, setShowDuplicateModal] = useState(false)
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([])

  useEffect(() => {
    const fetchMappings = async () => {
      const { data } = await supabase.from('perfume_mappings').select('*').order('original_name')
      if (data) {
        setMappings(data)
        setResults(data)
      }
      setLoading(false)
    }
    fetchMappings()
  }, [])

  useEffect(() => {
    let filtered = mappings
    if (genderFilter !== 'Todos') filtered = filtered.filter(m => m.gender === genderFilter)
    if (searchTerm) {
      const fuse = new Fuse(filtered, { keys: ['original_name', 'brand'], threshold: 0.35 })
      filtered = fuse.search(searchTerm).map(r => r.item)
    }
    setResults(filtered)
  }, [searchTerm, genderFilter, mappings])

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast.success(`Código ${code} copiado`)
  }

  const sendSuggestionEmail = async () => {
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          cost_per_gram: formData.cost_per_gram ? parseFloat(formData.cost_per_gram) : null,
        }),
      })

      if (response.ok) {
        toast.success('¡Sugerencia enviada!')
        setShowModal(false)
        setFormData({ original_name: '', brand: '', fraiche_code: '', gender: 'Caballero', cost_per_gram: '' })
      } else {
        toast.error('Error al enviar la sugerencia')
      }
    } catch {
      toast.error('Error de conexión')
    }
    setSubmitting(false)
  }

  const handleSubmitSuggestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.original_name || !formData.fraiche_code) {
      toast.error('Nombre y código Fraiche son obligatorios')
      return
    }

    setSubmitting(true)

    const { data: existing } = await supabase
      .from('perfume_mappings')
      .select('*')
      .or(`original_name.ilike.%${formData.original_name}%,fraiche_code.ilike.%${formData.fraiche_code}%`)
      .limit(10)

    const normalizedName = formData.original_name.toLowerCase().trim()
    const normalizedCode = formData.fraiche_code.toLowerCase().trim()

    const matches = (existing || []).filter(item =>
      item.original_name.toLowerCase().includes(normalizedName) ||
      normalizedName.includes(item.original_name.toLowerCase()) ||
      item.fraiche_code.toLowerCase().includes(normalizedCode) ||
      normalizedCode.includes(item.fraiche_code.toLowerCase())
    )

    if (matches.length > 0) {
      setDuplicateMatches(matches)
      setShowDuplicateModal(true)
      setSubmitting(false)
      return
    }

    await sendSuggestionEmail()
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#20cbd4] rounded-2xl flex items-center justify-center">
              <span className="font-bold text-2xl text-white">F</span>
            </div>
            <div>
              <div className="font-bold text-2xl tracking-tight text-zinc-900">Fraiche Finder</div>
              <div className="text-[10px] text-zinc-500 -mt-1">Códigos equivalentes</div>
            </div>
          </a>

          <a href="/admin" className="px-5 py-2.5 rounded-2xl border border-zinc-300 hover:bg-zinc-100 text-sm font-medium text-zinc-700">
            Panel de Admin
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-8 text-center">
        <h1 className="text-6xl font-bold tracking-tighter text-zinc-900">Busca tu código Fraiche</h1>
        <p className="mt-4 text-xl text-zinc-600">Encuentra el equivalente de tus perfumes favoritos</p>
      </div>

      {/* Buscador + Filtros */}
      <div className="max-w-5xl mx-auto px-6 sticky top-0 bg-white z-50 pb-6 border-b border-zinc-100">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-4 text-zinc-400" size={20} />
            <input
              type="text"
              placeholder="Busca un perfume..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-zinc-300 rounded-3xl pl-12 pr-6 py-4 text-lg placeholder:text-zinc-400 focus:border-[#20cbd4] focus:outline-none"
            />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-8 py-4 rounded-3xl bg-[#20cbd4] hover:bg-[#1bb8c2] text-white font-semibold transition-colors">
            <Plus size={20} /> Sugerir equivalencia
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {(['Todos', 'Dama', 'Caballero', 'Unisex'] as const).map(g => (
            <button key={g} onClick={() => setGenderFilter(g)} className={`px-6 py-2 rounded-2xl text-sm font-medium transition-all ${genderFilter === g ? 'bg-[#20cbd4] text-white' : 'bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      <div className="max-w-5xl mx-auto px-6 pb-20 pt-4">
        {loading ? (
          <div className="text-center py-16 text-zinc-500">Cargando...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-16"><p className="text-2xl text-zinc-500">No se encontraron resultados</p></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((item) => (
              <div key={item.id} className="bg-white border border-zinc-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all">
                <div className="flex justify-between items-start mb-5">
                  <div className="flex-1 pr-4">
                    <div className="font-semibold text-2xl tracking-tight leading-tight text-zinc-900">{item.original_name}</div>
                    {item.brand && <div className="text-sm text-zinc-500 mt-1">{item.brand}</div>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {item.gender && <span className="px-3 py-0.5 text-xs rounded-full bg-zinc-100 text-zinc-600">{item.gender}</span>}
                    {item.cost_per_gram && <span className="px-3 py-0.5 text-xs rounded-full bg-[#e0f7fa] text-[#0e9aa8] font-medium">${item.cost_per_gram} /g</span>}
                  </div>
                </div>

                {/* Código Fraiche */}
                <div className="flex justify-between items-center bg-zinc-50 rounded-2xl p-5">
                  <div>
                    <div className="text-xs tracking-[2px] text-zinc-500 font-medium">CÓDIGO FRAICHE</div>
                    <div className="font-mono text-[42px] leading-none font-bold text-[#20cbd4] tracking-[-3.5px] mt-1">
                      {item.fraiche_code}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => copyCode(item.fraiche_code)}
                      className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#20cbd4] hover:bg-[#1bb8c2] text-white font-medium transition-colors text-sm"
                    >
                      <Copy size={16} /> Copiar
                    </button>

                    {item.link && (
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-700 font-medium transition-colors text-sm"
                      >
                        Ver en Fraiche
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Sugerir */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative shadow-xl">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-zinc-600">✕</button>
            <h2 className="text-2xl font-semibold mb-6 text-zinc-900">Sugerir nueva equivalencia</h2>
            <form onSubmit={handleSubmitSuggestion} className="space-y-4">
              <input type="text" placeholder="Nombre del perfume original *" value={formData.original_name} onChange={e => setFormData({ ...formData, original_name: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-2xl px-5 py-3.5" required />
              <input type="text" placeholder="Marca" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-2xl px-5 py-3.5" />
              <input type="text" placeholder="Código Fraiche *" value={formData.fraiche_code} onChange={e => setFormData({ ...formData, fraiche_code: e.target.value })} className="w-full bg-white border border-zinc-300 rounded-2xl px-5 py-3.5 font-mono" required />
              <div className="grid grid-cols-2 gap-4">
                <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })} className="bg-white border border-zinc-300 rounded-2xl px-5 py-3.5">
                  <option value="Caballero">Caballero</option>
                  <option value="Dama">Dama</option>
                  <option value="Unisex">Unisex</option>
                </select>
                <input type="number" step="0.01" placeholder="Costo por gramo (opcional)" value={formData.cost_per_gram} onChange={e => setFormData({ ...formData, cost_per_gram: e.target.value })} className="bg-white border border-zinc-300 rounded-2xl px-5 py-3.5" />
              </div>
              <button type="submit" disabled={submitting} className="w-full py-4 mt-4 rounded-2xl bg-[#20cbd4] hover:bg-[#1bb8c2] text-white font-semibold disabled:opacity-70">
                {submitting ? 'Verificando...' : 'Enviar sugerencia'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Duplicados */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[110] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">Posibles duplicados encontrados</h3>
            <div className="space-y-3 mb-8">
              {duplicateMatches.map((item, i) => (
                <div key={i} className="bg-zinc-50 p-4 rounded-2xl border border-zinc-200">
                  {item.original_name} → <span className="text-[#20cbd4] font-mono">{item.fraiche_code}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDuplicateModal(false)} className="flex-1 py-3 rounded-2xl border border-zinc-300">Cancelar</button>
              <button onClick={() => { setShowDuplicateModal(false); sendSuggestionEmail() }} className="flex-1 py-3 rounded-2xl bg-[#20cbd4] text-white">Enviar de todas formas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}