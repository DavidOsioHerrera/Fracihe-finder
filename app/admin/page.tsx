'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { Toaster, toast } from 'sonner'
import { Check, Trash2, Edit2, LogOut, Home, Plus, X } from 'lucide-react'

export default function AdminPanel() {
  const [mappings, setMappings] = useState<PerfumeMapping[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingItem, setEditingItem] = useState<PerfumeMapping | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const [newItem, setNewItem] = useState({
    original_name: '',
    brand: '',
    fraiche_code: '',
    gender: 'Caballero' as 'Dama' | 'Caballero' | 'Unisex',
    cost_per_gram: '',
    link: '',
  })

  const router = useRouter()

  // Verificar si el usuario es admin
  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

      if (!profile?.is_admin) {
        toast.error('No tienes permisos de administrador')
        router.push('/')
        return
      }

      setIsAdmin(true)
      fetchMappings()
    }

    checkAdmin()
  }, [router])

  const fetchMappings = async () => {
    const { data } = await supabase
      .from('perfume_mappings')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) setMappings(data)
    setLoading(false)
  }

  const filteredMappings = mappings.filter(item =>
    item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fraiche_code.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Crear nueva fragancia
  const createNewItem = async () => {
    if (!newItem.original_name || !newItem.fraiche_code) {
      toast.error('Nombre y código Fraiche son obligatorios')
      return
    }

    const { error } = await supabase.from('perfume_mappings').insert({
      original_name: newItem.original_name,
      brand: newItem.brand || null,
      fraiche_code: newItem.fraiche_code,
      gender: newItem.gender,
      cost_per_gram: newItem.cost_per_gram ? parseFloat(newItem.cost_per_gram) : null,
      link: newItem.link || null,
      is_verified: true,
    })

    if (error) {
      toast.error('Error al crear la entrada')
    } else {
      toast.success('Fragancia agregada correctamente')
      setShowCreateModal(false)
      setNewItem({ original_name: '', brand: '', fraiche_code: '', gender: 'Caballero', cost_per_gram: '', link: '' })
      fetchMappings()
    }
  }

  const verifyMapping = async (id: string) => {
    await supabase.from('perfume_mappings').update({ is_verified: true }).eq('id', id)
    toast.success('Verificado')
    fetchMappings()
  }

  const deleteMapping = async (id: string) => {
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
      cost_per_gram: editingItem.cost_per_gram,
      link: editingItem.link,
    }).eq('id', editingItem.id)

    if (error) {
      toast.error('Error al guardar')
    } else {
      toast.success('Cambios guardados')
      setEditingItem(null)
      fetchMappings()
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        Verificando permisos...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-6">
      <Toaster />

      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700">
              <Home size={20} /> Volver al inicio
            </a>
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200">
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>

        <div className="flex justify-between items-center mb-6">
          <input
            type="text"
            placeholder="Buscar fragancia..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full max-w-md border border-zinc-300 rounded-2xl px-5 py-3"
          />
          <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#20cbd4] text-white font-semibold">
            <Plus size={18} /> Agregar nueva
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left p-5">Perfume</th>
                <th className="text-left p-5">Código Fraiche</th>
                <th className="text-left p-5">Género</th>
                <th className="text-left p-5">Costo/g</th>
                <th className="text-center p-5">Likes</th>
                <th className="text-center p-5">Dislikes</th>
                <th className="text-center p-5">Estado</th>
                <th className="text-right p-5 pr-8">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map(item => (
                <tr key={item.id} className="border-t border-zinc-100">
                  <td className="p-5 font-medium">{item.original_name}</td>
                  <td className="p-5 font-mono text-[#20cbd4]">{item.fraiche_code}</td>
                  <td className="p-5 text-sm">{item.gender}</td>
                  <td className="p-5 text-sm">{item.cost_per_gram ? `$${item.cost_per_gram}` : '-'}</td>
                  <td className="p-5 text-center text-green-600 font-medium">{item.likes || 0}</td>
                  <td className="p-5 text-center text-red-600 font-medium">{item.dislikes || 0}</td>
                  <td className="p-5 text-center">
                    {item.is_verified 
                      ? <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full">Verificado</span>
                      : <span className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">Pendiente</span>
                    }
                  </td>
                  <td className="p-5 text-right pr-6">
                    <div className="flex justify-end gap-2">
                      {!item.is_verified && <button onClick={() => verifyMapping(item.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl"><Check size={18}/></button>}
                      <button onClick={() => setEditingItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 size={18}/></button>
                      <button onClick={() => deleteMapping(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 relative">
            <button onClick={() => setShowCreateModal(false)} className="absolute top-6 right-6"><X size={22} /></button>
            <h3 className="text-xl font-semibold mb-6">Agregar nueva fragancia</h3>
            <div className="space-y-4">
              <input placeholder="Nombre del perfume *" value={newItem.original_name} onChange={e => setNewItem({...newItem, original_name: e.target.value})} className="w-full border border-zinc-300 rounded-2xl px-5 py-3" />
              <input placeholder="Marca" value={newItem.brand} onChange={e => setNewItem({...newItem, brand: e.target.value})} className="w-full border border-zinc-300 rounded-2xl px-5 py-3" />
              <input placeholder="Código Fraiche *" value={newItem.fraiche_code} onChange={e => setNewItem({...newItem, fraiche_code: e.target.value})} className="w-full border border-zinc-300 rounded-2xl px-5 py-3 font-mono" />
              <div className="grid grid-cols-2 gap-4">
                <select value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as any})} className="border border-zinc-300 rounded-2xl px-5 py-3">
                  <option value="Caballero">Caballero</option>
                  <option value="Dama">Dama</option>
                  <option value="Unisex">Unisex</option>
                </select>
                <input type="number" step="0.01" placeholder="Costo por gramo" value={newItem.cost_per_gram} onChange={e => setNewItem({...newItem, cost_per_gram: e.target.value})} className="border border-zinc-300 rounded-2xl px-5 py-3" />
              </div>
              <input placeholder="Link (URL)" value={newItem.link} onChange={e => setNewItem({...newItem, link: e.target.value})} className="w-full border border-zinc-300 rounded-2xl px-5 py-3" />
            </div>
            <button onClick={createNewItem} className="w-full mt-6 py-3 rounded-2xl bg-[#20cbd4] text-white font-semibold">Agregar fragancia</button>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8">
            <h3 className="text-xl font-semibold mb-6">Editar entrada</h3>
            <div className="space-y-4">
              <input className="w-full border border-zinc-300 rounded-2xl px-5 py-3" value={editingItem.original_name} onChange={e => setEditingItem({...editingItem, original_name: e.target.value})} />
              <input className="w-full border border-zinc-300 rounded-2xl px-5 py-3" value={editingItem.brand || ''} onChange={e => setEditingItem({...editingItem, brand: e.target.value})} />
              <input className="w-full border border-zinc-300 rounded-2xl px-5 py-3 font-mono" value={editingItem.fraiche_code} onChange={e => setEditingItem({...editingItem, fraiche_code: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <select className="w-full border border-zinc-300 rounded-2xl px-5 py-3" value={editingItem.gender || ''} onChange={e => setEditingItem({...editingItem, gender: e.target.value as any})}>
                  <option value="Caballero">Caballero</option>
                  <option value="Dama">Dama</option>
                  <option value="Unisex">Unisex</option>
                </select>
                <input type="number" step="0.01" className="w-full border border-zinc-300 rounded-2xl px-5 py-3" value={editingItem.cost_per_gram || ''} onChange={e => setEditingItem({...editingItem, cost_per_gram: parseFloat(e.target.value) || null})} />
              </div>
              <input placeholder="Link (URL)" className="w-full border border-zinc-300 rounded-2xl px-5 py-3" value={editingItem.link || ''} onChange={e => setEditingItem({...editingItem, link: e.target.value})} />
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditingItem(null)} className="flex-1 py-3 rounded-2xl border border-zinc-300">Cancelar</button>
              <button onClick={saveEdit} className="flex-1 py-3 rounded-2xl bg-[#20cbd4] text-white">Guardar cambios</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}