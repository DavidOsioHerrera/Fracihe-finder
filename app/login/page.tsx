'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error('Error al iniciar sesión', { description: error.message })
    } else {
      toast.success('Sesión iniciada correctamente')
      router.push('/admin')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white p-6">
      <Toaster />
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8">Panel de Administración</h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input type="email" placeholder="Correo electrónico" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4" required />
          <input type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-zinc-900 border border-zinc-700 rounded-2xl px-5 py-4" required />
          <button type="submit" disabled={loading} className="w-full py-4 rounded-2xl bg-emerald-600 font-semibold disabled:opacity-70">
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  )
}