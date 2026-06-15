'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Toaster, toast } from 'sonner'

export default function SignupPage() {
	const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      toast.error('Error al registrarse', { description: error.message })
    } else {
      // Si ya hay sesión (porque quitamos la confirmación de email)
      if (data.session) {
        toast.success('¡Registro exitoso!')
        router.push('/')
      } else {
        // Si por alguna razón no hay sesión inmediata
        toast.success('Registro completado')
        router.push('/login')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <Toaster />
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8 text-zinc-500">Crear Cuenta</h1>

        <form onSubmit={handleSignup} className="space-y-4">
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
            placeholder="Contraseña (mínimo 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-zinc-500 rounded-2xl px-5 py-4 text-zinc-500"
            required
            minLength={6}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-[#20cbd4] text-white font-semibold disabled:opacity-70"
          >
            {loading ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        <p className="text-center text-sm mt-6 text-zinc-500">
          ¿Ya tienes cuenta?{' '}
          <a href="/login" className="text-[#20cbd4] hover:underline">Inicia sesión</a>
        </p>
      </div>
    </div>
  )
}