'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { Toaster, toast } from 'sonner'
import { Check, Trash2, Edit2, LogOut, Home } from 'lucide-react'

export default function AdminPanel() {
  const [mappings, setMappings] = useState<PerfumeMapping[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<PerfumeMapping | null>(null)
  const router = useRouter()

  const fetchMappings = async () => {
    const { data } = await supabase.from('perfume_mappings').select('*').order('created_at', { ascending: false })
    if (data) setMappings(data)
    setLoading(false)
  }

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/login')
      else fetchMappings()
    }
    checkAuth()
  }, [router])

  const filteredMappings = mappings.filter(m =>
    m.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    m.fraiche_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const verify = async (id: string) => {
    await supabase.from('perfume_mappings').update({ is_verified: true }).eq('id', id)
    toast.success('Verificado')
    fetchMappings()
  }

  const remove = async (id: string) => {
    if (!confirm('¿Eliminar esta entrada?')) return
    await supabase.from('perfume_mappings').delete().eq('id', id)
    toast.success('Eliminado')
    fetchMappings()
  }

  const saveEdit = async () => {
    if (!editingItem) return
    const { error } = await supabase.from('perfume_mappings').update({
      original_name: editingItem.original_name,
      brand: editingItem.brand,
      fraiche_code: editingItem.fraiche_code,
      gender: editingItem.gender,
    }).eq('id', editingItem.id)

    if (error) toast.error('Error al guardar')
    else {
      toast.success('Cambios guardados')
      setEditingItem(null)
      fetchMappings()
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <Toaster />

      <div className="max-w-7xl mx-auto">
        {/* Header Admin */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300">
              <Home size={20} /> Volver al inicio
            </a>
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="flex items-center gap-2 px-5 py-2 rounded-2xl bg-zinc-800">
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>

        {/* Buscador del Admin */}
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full max-w-md mb-6 bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-3"
        />

        {/* Tabla */}
        <div className="bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-800">
          <table className="w-full">
            <thead className="bg-zinc-950 text-sm">
              <tr>
                <th className="text-left p-5">Perfume</th>
                <th className="text-left p-5">Código Fraiche</th>
                <th className="text-left p-5">Género</th>
                <th className="text-center p-5">Estado</th>
                <th className="text-right p-5 pr-8">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map(item => (
                <tr key={item.id} className="border-t border-zinc-800">
                  <td className="p-5 font-medium">{item.original_name}</td>
                  <td className="p-5 font-mono text-emerald-400">{item.fraiche_code}</td>
                  <td className="p-5 text-sm">{item.gender}</td>
                  <td className="p-5 text-center">
                    {item.is_verified ? <span className="text-emerald-400 text-xs px-3 py-1 bg-emerald-950 rounded-full">Verificado</span> : <span className="text-amber-400 text-xs px-3 py-1 bg-amber-950 rounded-full">Pendiente</span>}
                  </td>
                  <td className="p-5 text-right pr-6">
                    <div className="flex justify-end gap-1">
                      {!item.is_verified && <button onClick={() => verify(item.id)} className="p-2 text-emerald-400 hover:bg-emerald-950 rounded-xl"><Check size={18} /></button>}
                      <button onClick={() => setEditingItem(item)} className="p-2 text-blue-400 hover:bg-blue-950 rounded-xl"><Edit2 size={18} /></button>
                      <button onClick={() => remove(item.id)} className="p-2 text-red-400 hover:bg-red-950 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edición */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100]">
          <div className="bg-zinc-900 rounded-3xl p-8 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-6">Editar entrada</h3>
            <div className="space-y-4">
              <input className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3" value={editingItem.original_name} onChange={e => setEditingItem({ ...editingItem, original_name: e.target.value })} />
              <input className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3" value={editingItem.brand || ''} onChange={e => setEditingItem({ ...editingItem, brand: e.target.value })} />
              <input className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3 font-mono" value={editingItem.fraiche_code} onChange={e => setEditingItem({ ...editingItem, fraiche_code: e.target.value })} />
              <select className="w-full bg-zinc-950 border border-zinc-700 rounded-2xl px-5 py-3" value={editingItem.gender || ''} onChange={e => setEditingItem({ ...editingItem, gender: e.target.value as any })}>
                <option value="Caballero">Caballero</option>
                <option value="Dama">Dama</option>
                <option value="Unisex">Unisex</option>
              </select>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-3 rounded-2xl border border-zinc-700">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 py-3 rounded-2xl bg-emerald-600">Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}