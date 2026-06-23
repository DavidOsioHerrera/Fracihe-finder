'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { PerfumeMapping } from '@/types'
import { Toaster, toast } from 'sonner'
import { Check, Trash2, Edit2, LogOut, Home, Plus, X, Copy } from 'lucide-react'
import { createFragrance, updateFragrance, deleteFragrance, verifyFragrance } from './actions'

export default function AdminPanel() {
  const supabase = createClient()
  const [mappings, setMappings] = useState<PerfumeMapping[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [editingItem, setEditingItem] = useState<PerfumeMapping | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortBy, setSortBy] = useState<'created_at' | 'original_name'>('created_at')

  const [newItem, setNewItem] = useState({
    original_name: '',
    brand: '',
    fraiche_code: '',
    gender: 'Caballero' as 'Dama' | 'Caballero' | 'Unisex',
    category: 'normal' as 'normal' | 'niche' | 'arabe',
    link: '',
  })

  const router = useRouter()

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

  const fetchMappings = async () => {
    setLoading(true)
    const { data } = await supabase.from('perfume_mappings').select('*').order(sortBy === 'created_at' ? 'created_at' : 'original_name', { ascending: sortBy === 'original_name' })
    if (data) setMappings(data)
    setLoading(false)
  }

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
      if (!profile?.is_admin) { toast.error('No tienes permisos'); router.push('/'); return }
      setIsAdmin(true)
      fetchMappings()
    }
    checkAdmin()
  }, [router])

  const filteredMappings = mappings.filter(item =>
    item.original_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fraiche_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.brand && item.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const formData = new FormData()
      Object.entries(newItem).forEach(([key, value]) => formData.append(key, value))
      await createFragrance(formData)
      toast.success('Fragancia creada')
      setShowCreateModal(false)
      setNewItem({ original_name: '', brand: '', fraiche_code: '', gender: 'Caballero', category: 'normal', link: '' })
      fetchMappings()
    } catch (error: any) { toast.error(error.message) }
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingItem) return
    try {
      const formData = new FormData()
      formData.append('original_name', editingItem.original_name)
      formData.append('brand', editingItem.brand || '')
      formData.append('fraiche_code', editingItem.fraiche_code)
      formData.append('gender', editingItem.gender || '')
      formData.append('category', editingItem.category || 'normal')
      formData.append('link', editingItem.link || '')
      await updateFragrance(editingItem.id, formData)
      toast.success('Actualizado')
      setEditingItem(null)
      fetchMappings()
    } catch (error: any) { toast.error(error.message) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar?')) return
    try { await deleteFragrance(id); toast.success('Eliminado'); fetchMappings() } catch (e: any) { toast.error(e.message) }
  }

  const handleVerify = async (id: string) => {
    try { await verifyFragrance(id); toast.success('Verificado'); fetchMappings() } catch (e: any) { toast.error(e.message) }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  if (loading || !isAdmin) return <div className="min-h-screen flex items-center justify-center">Verificando permisos...</div>

  return (
    <div className="min-h-screen bg-white text-zinc-900 p-6">
      <Toaster />
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <a href="/" className="flex items-center gap-2 text-zinc-500 hover:text-zinc-700"><Home size={20} /> Volver</a>
            <h1 className="text-3xl font-bold">Panel de Administración</h1>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200"><LogOut size={18} /> Cerrar sesión</button>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-600">Ordenar por:</span>
            <button onClick={() => { setSortBy('created_at'); fetchMappings() }} className={`px-4 py-1.5 rounded-xl text-sm font-medium ${sortBy === 'created_at' ? 'bg-[#20cbd4] text-white' : 'bg-white border border-zinc-300'}`}>Más reciente</button>
            <button onClick={() => { setSortBy('original_name'); fetchMappings() }} className={`px-4 py-1.5 rounded-xl text-sm font-medium ${sortBy === 'original_name' ? 'bg-[#20cbd4] text-white' : 'bg-white border border-zinc-300'}`}>Alfabético</button>
          </div>
          <div className="flex gap-3">
            <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full md:w-80 border border-zinc-300 rounded-2xl px-5 py-3" />
            <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#20cbd4] text-white font-semibold"><Plus size={18} /> Agregar</button>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-zinc-50">
              <tr>
                <th className="text-left p-5">Perfume</th>
                <th className="text-left p-5">Marca</th>
                <th className="text-left p-5">Código</th>
                <th className="text-left p-5">Género</th>
                <th className="text-left p-5">Categoría</th>
                <th className="text-center p-5">Estado</th>
                <th className="text-right p-5 pr-8">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMappings.map(item => (
                <tr key={item.id} className="border-t border-zinc-100">
                  <td className="p-5 font-medium">{item.original_name}</td>
                  <td className="p-5 text-sm">{item.brand || '-'}</td>
                  <td className="p-5 font-mono text-[#20cbd4]">{item.fraiche_code}</td>
                  <td className="p-5">{item.gender && getGenderBadge(item.gender)}</td>
                  <td className="p-5">{item.category && getCategoryBadge(item.category)}</td>
                  <td className="p-5 text-center">
                    {item.is_verified ? <span className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded-full">Verificado</span> : <span className="px-3 py-1 text-xs bg-amber-100 text-amber-700 rounded-full">Pendiente</span>}
                  </td>
                  <td className="p-5 text-right pr-6">
                    <div className="flex justify-end gap-2">
                      {!item.is_verified && <button onClick={() => handleVerify(item.id)} className="p-2 text-green-600 hover:bg-green-50 rounded-xl"><Check size={18}/></button>}
                      <button onClick={() => setEditingItem(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl"><Edit2 size={18}/></button>
                      <button onClick={() => handleDelete(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl"><Trash2 size={18}/></button>
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
            <form onSubmit={handleCreate} className="space-y-4">
              <input placeholder="Nombre *" value={newItem.original_name} onChange={e => setNewItem({...newItem, original_name: e.target.value})} className="w-full border border-zinc-300 rounded-2xl px-5 py-3" required />
              <input placeholder="Marca" value={newItem.brand} onChange={e => setNewItem({...newItem, brand: e.target.value})} className="w-full border border-zinc-300 rounded-2xl px-5 py-3" />
              <div className="relative">
                <input placeholder="Código Fraiche *" value={newItem.fraiche_code} onChange={e => setNewItem({...newItem, fraiche_code: e.target.value})} className="w-full border border-zinc-300 rounded-2xl px-5 py-3 pr-12 font-mono" required />
                <button type="button" onClick={() => { if (newItem.fraiche_code) { navigator.clipboard.writeText(newItem.fraiche_code); toast.success('Copiado') }}} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"><Copy size={18} /></button>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={newItem.gender} onChange={e => setNewItem({...newItem, gender: e.target.value as any})} className="border border-zinc-300 rounded-2xl px-5 py-3">
                  <option value="Caballero">Caballero</option><option value="Dama">Dama</option><option value="Unisex">Unisex</option>
                </select>
                <select value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value as any})} className="border border-zinc-300 rounded-2xl px-5 py-3">
                  <option value="normal">Normal</option>
                  <option value="niche">Niche</option>
                  <option value="arabe">Árabe</option>
                </select>
              </div>
              <input placeholder="Link" value={newItem.link} onChange={e => setNewItem({...newItem, link: e.target.value})} className="w-full border border-zinc-300 rounded-2xl px-5 py-3" />
              <button type="submit" className="w-full py-3 rounded-2xl bg-[#20cbd4] text-white font-semibold">Crear fragancia</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
		{editingItem && (
		  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
			<div className="bg-white rounded-3xl w-full max-w-md p-8">
			  <h3 className="text-xl font-semibold mb-6">Editar fragancia</h3>
			  <form onSubmit={handleUpdate} className="space-y-4">
				<input 
				  className="w-full border border-zinc-300 rounded-2xl px-5 py-3" 
				  value={editingItem.original_name} 
				  onChange={e => setEditingItem({...editingItem, original_name: e.target.value})} 
				/>
				<input 
				  className="w-full border border-zinc-300 rounded-2xl px-5 py-3" 
				  value={editingItem.brand || ''} 
				  onChange={e => setEditingItem({...editingItem, brand: e.target.value})} 
				/>
				<input 
				  className="w-full border border-zinc-300 rounded-2xl px-5 py-3 font-mono" 
				  value={editingItem.fraiche_code} 
				  onChange={e => setEditingItem({...editingItem, fraiche_code: e.target.value})} 
				/>

				<div className="grid grid-cols-2 gap-4">
				  {/* Género */}
				  <select 
					className="w-full border border-zinc-300 rounded-2xl px-5 py-3" 
					value={editingItem.gender || ''} 
					onChange={e => setEditingItem({...editingItem, gender: e.target.value as any})}
				  >
					<option value="Caballero">Caballero</option>
					<option value="Dama">Dama</option>
					<option value="Unisex">Unisex</option>
				  </select>

				  {/* Categoría - CORREGIDO */}
				  <select 
					className="w-full border border-zinc-300 rounded-2xl px-5 py-3" 
					value={editingItem.category || 'normal'} 
					onChange={e => setEditingItem({...editingItem, category: e.target.value as any})}
				  >
					<option value="normal">Normal</option>
					<option value="niche">Niche</option>
					<option value="arabe">Árabe</option>
				  </select>
				</div>

				<input 
				  placeholder="Link" 
				  className="w-full border border-zinc-300 rounded-2xl px-5 py-3" 
				  value={editingItem.link || ''} 
				  onChange={e => setEditingItem({...editingItem, link: e.target.value})} 
				/>

				<div className="flex gap-3 mt-6">
				  <button 
					type="button" 
					onClick={() => setEditingItem(null)} 
					className="flex-1 py-3 rounded-2xl border border-zinc-300"
				  >
					Cancelar
				  </button>
				  <button 
					type="submit" 
					className="flex-1 py-3 rounded-2xl bg-[#20cbd4] text-white"
				  >
					Guardar cambios
				  </button>
				</div>
			  </form>
			</div>
		  </div>
		)}
    </div>
  )
}