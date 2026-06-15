'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    if (data?.user) {
      toast.success('Inicio de sesión exitoso')
      router.push('/')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" richColors />

      <header className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#20cbd4] rounded-2xl flex items-center justify-center">
              <span className="font-bold text-2xl text-white">F</span>
            </div>
            <div>
              <div className="font-bold text-2xl tracking-tight text-zinc-600">Fraiche Finder</div>
              <div className="text-[10px] text-zinc-500 -mt-1">Códigos equivalentes</div>
            </div>
          </a>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-73px)] px-6">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-bold text-center mb-2 text-zinc-600">Iniciar Sesión</h1>
          <p className="text-center text-zinc-600 mb-8">Accede para votar en los rankings</p>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-1.5 text-zinc-600">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-zinc-300 rounded-2xl px-5 py-3 focus:border-[#20cbd4] outline-none text-zinc-600"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5 text-zinc-600">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-zinc-300 rounded-2xl px-5 py-3 focus:border-[#20cbd4] outline-none text-zinc-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#20cbd4] text-white font-semibold disabled:opacity-70 hover:bg-[#1bb8c2] transition-colors"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-zinc-600">
            ¿No tienes cuenta?{' '}
            <a href="/signup" className="text-[#20cbd4] hover:underline font-medium">
              Regístrate aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}