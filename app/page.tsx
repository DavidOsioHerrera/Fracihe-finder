'use client'

import { useState, useEffect } from 'react'
import Fuse from 'fuse.js'
import { Search, Copy, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { Toaster, toast } from 'sonner'

type GenderFilter = 'Todos' | 'Dama' | 'Caballero' | 'Unisex'

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

export default function FraicheFinder() {
  const [mappings, setMappings] = useState<PerfumeMapping[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [genderFilter, setGenderFilter] = useState<GenderFilter>('Todos')
  const [results, setResults] = useState<PerfumeMapping[]>([])
  const [loading, setLoading] = useState(true)

  // Modal de sugerencias
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    original_name: '',
    brand: '',
    fraiche_code: '',
    gender: 'Caballero' as 'Dama' | 'Caballero' | 'Unisex',
    cost_per_gram: '', // ← Nuevo campo
  })
  const [submitting, setSubmitting] = useState(false)

  // Estados para duplicados
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

    // Validación de duplicados
    const { data: existing } = await supabase
      .from('perfume_mappings')
      .select('*')
      .or(`original_name.ilike.%${formData.original_name}%,fraiche_code.ilike.%${formData.fraiche_code}%`)
      .limit(10)

    const normalizedName = normalizeText(formData.original_name)
    const normalizedCode = normalizeText(formData.fraiche_code)

    const matches = (existing || []).filter(item => {
      const nName = normalizeText(item.original_name)
      const nCode = normalizeText(item.fraiche_code)
      return nName.includes(normalizedName) || normalizedName.includes(nName) ||
             nCode.includes(normalizedCode) || normalizedCode.includes(nCode)
    })

    if (matches.length > 0) {
      setDuplicateMatches(matches)
      setShowDuplicateModal(true)
      setSubmitting(false)
      return
    }

    await sendSuggestionEmail()
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Toaster position="top-center" richColors />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center">
              <span className="font-bold text-2xl">F</span>
            </div>
            <div>
              <div className="font-bold text-2xl tracking-tight">Fraiche Finder</div>
              <div className="text-[10px] text-zinc-400 -mt-1">Códigos equivalentes</div>
            </div>
          </a>
        </div>
      </header>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-14 pb-8 text-center">
        <h1 className="text-6xl font-bold tracking-tighter">Busca tu código Fraiche</h1>
        <p className="mt-4 text-xl text-zinc-400">Encuentra el equivalente de tus perfumes favoritos</p>
      </div>

      {/* Buscador + Filtros */}
      <div className="max-w-5xl mx-auto px-6 sticky top-0 bg-zinc-950 z-50 pb-6">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-4 text-zinc-500" size={20} />
            <input
              type="text"
              placeholder="Busca un perfume..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-3xl pl-12 pr-6 py-4 text-lg focus:border-emerald-500 outline-none"
            />
          </div>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-8 py-4 rounded-3xl bg-emerald-600 hover:bg-emerald-500 font-semibold">
            <Plus size={20} /> Sugerir equivalencia
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {(['Todos', 'Dama', 'Caballero', 'Unisex'] as const).map(g => (
            <button key={g} onClick={() => setGenderFilter(g)} className={`px-6 py-2 rounded-2xl text-sm font-medium ${genderFilter === g ? 'bg-emerald-600' : 'bg-zinc-900 border border-zinc-700'}`}>
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Resultados */}
      <div className="max-w-5xl mx-auto px-6 pb-20 pt-4">
        {loading ? (
          <div className="text-center py-16 text-zinc-400">Cargando...</div>
        ) : results.length === 0 ? (
          <div className="text-center py-16"><p className="text-2xl text-zinc-400">No se encontraron resultados</p></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((item) => (
              <div key={item.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
                
                {/* Header con Nombre + Marca + Género + Costo */}
                <div className="flex justify-between items-start mb-5">
                  {/* Nombre y Marca */}
                  <div className="flex-1 pr-4">
                    <div className="font-semibold text-2xl tracking-tight leading-tight">{item.original_name}</div>
                    {item.brand && <div className="text-sm text-zinc-400 mt-1">{item.brand}</div>}
                  </div>

                  {/* Género + Costo por gramo (alineados verticalmente) */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    {item.gender && (
                      <span className="px-3 py-0.5 text-xs rounded-full bg-zinc-800 text-zinc-300">
                        {item.gender}
                      </span>
                    )}
                    {item.cost_per_gram && (
                      <span className="px-3 py-0.5 text-xs rounded-full bg-emerald-950 text-emerald-400 font-medium">
                        Costo de Referencia ${item.cost_per_gram} / g
                      </span>
                    )}
                  </div>
                </div>

                {/* Código Fraiche */}
                <div className="flex justify-between items-center bg-zinc-950 rounded-2xl p-5">
                  <div>
                    <div className="text-xs tracking-[2px] text-emerald-400 font-medium">CÓDIGO FRAICHE</div>
                    <div className="font-mono text-[42px] leading-none font-bold text-emerald-400 tracking-[-3.5px] mt-1">
                      {item.fraiche_code}
                    </div>
                  </div>
                  <button onClick={() => copyCode(item.fraiche_code)} className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-950 hover:bg-emerald-900 text-emerald-400 font-medium">
                    <Copy size={19} /> Copiar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Sugerencias (con costo por gramo) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-md p-8 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-zinc-400 hover:text-white">✕</button>

            <h2 className="text-2xl font-semibold mb-6">Sugerir nueva equivalencia</h2>

            <form onSubmit={handleSubmitSuggestion} className="space-y-4">
              <input type="text" placeholder="Nombre del perfume original *" value={formData.original_name} onChange={e => setFormData({ ...formData, original_name: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3.5" required />
              <input type="text" placeholder="Marca" value={formData.brand} onChange={e => setFormData({ ...formData, brand: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3.5" />
              <input type="text" placeholder="Código Fraiche *" value={formData.fraiche_code} onChange={e => setFormData({ ...formData, fraiche_code: e.target.value })} className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3.5 font-mono" required />

              <div className="grid grid-cols-2 gap-4">
                <select value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value as any })} className="bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3.5">
                  <option value="Caballero">Caballero</option>
                  <option value="Dama">Dama</option>
                  <option value="Unisex">Unisex</option>
                </select>

                {/* Nuevo campo: Costo por gramo */}
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="Costo por gramo (opcional)" 
                  value={formData.cost_per_gram} 
                  onChange={e => setFormData({ ...formData, cost_per_gram: e.target.value })} 
                  className="bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3.5" 
                />
              </div>

              <button type="submit" disabled={submitting} className="w-full py-4 mt-4 rounded-2xl bg-emerald-600 font-semibold disabled:opacity-70">
                {submitting ? 'Verificando...' : 'Enviar sugerencia'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Duplicados */}
      {showDuplicateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[110] p-4">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-lg p-8">
            <h3 className="text-xl font-semibold mb-4">Posibles duplicados encontrados</h3>
            <div className="space-y-3 mb-8">
              {duplicateMatches.map((item, i) => (
                <div key={i} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-700">
                  <div>{item.original_name} → <span className="text-emerald-400 font-mono">{item.fraiche_code}</span></div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDuplicateModal(false)} className="flex-1 py-3 rounded-2xl border border-zinc-700">Cancelar</button>
              <button onClick={() => { setShowDuplicateModal(false); sendSuggestionEmail(); }} className="flex-1 py-3 rounded-2xl bg-emerald-600">Enviar de todas formas</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}