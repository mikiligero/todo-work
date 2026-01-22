'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, checkAnyUserExists, createFirstUser } from '@/app/actions/auth'
import { Loader2, Lock, Sparkles, CheckCircle } from 'lucide-react'

export default function LoginPage() {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState<string>('')
    const [isSetupMode, setIsSetupMode] = useState<boolean>(false)
    const [checking, setChecking] = useState<boolean>(true)

    useEffect(() => {
        checkAnyUserExists().then((exists) => {
            setIsSetupMode(!exists)
            setChecking(false)
        })
    }, [])

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        const formData = new FormData(e.currentTarget)

        startTransition(async () => {
            const result = await (isSetupMode ? createFirstUser(formData) : login(formData))
            if (result?.error) {
                setError(result.error)
            } else {
                // Redirect handled by server action usually, but we can also push here if needed
                // actions use 'redirect' which throws, so we might not reach here if successful on server
            }
        })
    }

    if (checking) return null

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl">
                <div className="flex flex-col items-center mb-8">
                    <div className={`mb-6 p-1 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-200 dark:border-zinc-700`}>
                        <img src="/icon.png" alt="Logo" className="w-16 h-16 rounded-xl" />
                    </div>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white text-center tracking-tight">
                        {isSetupMode ? 'Bienvenido a Todo Kines' : 'Todo Kines'}
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-2 text-center">
                        {isSetupMode
                            ? 'Crea tu cuenta de administrador para empezar'
                            : 'Inicia sesión para acceder a las tareas de tu organización'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Nombre de usuario
                        </label>
                        <input
                            name="username"
                            type="text"
                            required
                            autoComplete="username"
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            placeholder="Introduce tu nombre de usuario"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                            Contraseña
                        </label>
                        <input
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            className="w-full bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-white rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium text-center flex items-center justify-center gap-2">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isPending}
                        className={`w-full text-white font-semibold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2 ${isSetupMode
                            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
                            : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
                            }`}
                    >
                        {isPending ? (
                            <Loader2 className="animate-spin" size={20} />
                        ) : (
                            isSetupMode ? 'Crear Cuenta Administrador' : 'Entrar'
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
