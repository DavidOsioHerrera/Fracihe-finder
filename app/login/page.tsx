'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'
import { authRatelimit } from '@/lib/rate-limit'

export default function LoginPage() {
  const supabase = createClient()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Rate Limiting: máximo 5 intentos cada 5 minutos por email
      const { success } = await authRatelimit.limit(`login:${email.toLowerCase()}`)

      if (!success) {
        toast.error('Demasiados intentos fallidos. Espera unos minutos.')
        setLoading(false)
        return
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Inicio de sesión exitoso')
        router.push('/')
        router.refresh()
      }
    } catch (error: any) {
      toast.error(error.message || 'Error al iniciar sesión')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <Toaster position="top-center" richColors />

      {/* Header con Logo */}
      <header className="border-b border-zinc-200">
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#20cbd4] rounded-2xl flex items-center justify-center">
              <span className="font-bold text-2xl text-white">F</span>
            </div>
            <div>
              <div className="font-bold text-2xl tracking-tight">Fraiche Finder</div>
              <div className="text-[10px] text-zinc-500 -mt-1">Códigos equivalentes</div>
            </div>
          </a>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-[calc(100vh-73px)]">
        <div className="w-full max-w-md px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">Iniciar Sesión</h1>
            <p className="text-zinc-600 mt-2">Accede a tu cuenta para votar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-zinc-300 rounded-2xl px-5 py-3 focus:border-[#20cbd4] outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-zinc-300 rounded-2xl px-5 py-3 focus:border-[#20cbd4] outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-2xl bg-[#20cbd4] hover:bg-[#1bb8c2] text-white font-semibold disabled:opacity-70 transition-colors"
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