'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

export default function LoginPage() {
	const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error('Error al iniciar sesión', { description: error.message })
    } else {
      toast.success('Sesión iniciada correctamente')
      router.push('/') // Redirige a la página principal
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <Toaster />
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8 text-zinc-500">Iniciar Sesión</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-zinc-500 rounded-2xl px-5 py-4 text-zinc-500"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-zinc-500 rounded-2xl px-5 py-4 text-zinc-500"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#20cbd4] text-white font-semibold disabled:opacity-70"
          >
            {loading ? 'Ingresando...' : 'Iniciar Sesión'}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-zinc-500">
          ¿No tienes cuenta?{' '}
          <a href="/signup" className="text-[#20cbd4] hover:underline">Regístrate aquí</a>
        </p>
      </div>
    </div>
  )
}