'use client'

import { useState, useTransition } from 'react'
import { Bell, Save, Send, HelpCircle, ChevronDown, ChevronUp, Bot, MessageSquare } from 'lucide-react'
import { saveNotificationSettings, sendTestNotification } from '@/app/actions/notifications'

interface NotificationSettingsFormProps {
    settings: any // Prisma type
}

export function NotificationSettingsForm({ settings }: NotificationSettingsFormProps) {
    const [isPending, startTransition] = useTransition()
    const [isTestPending, startTestTransition] = useTransition()
    const [showHelp, setShowHelp] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    const handleSubmit = async (formData: FormData) => {
        setMessage(null)
        startTransition(async () => {
            const result = await saveNotificationSettings(formData)
            if (result.success) {
                setMessage({ type: 'success', text: 'Configuración guardada correctamente' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al guardar' })
            }
        })
    }

    const handleTest = () => {
        setMessage(null)
        startTestTransition(async () => {
            const result = await sendTestNotification()
            if (result.success) {
                setMessage({ type: 'success', text: 'Mensaje de prueba enviado. Revisa tu Telegram.' })
            } else {
                setMessage({ type: 'error', text: result.error || 'Error al enviar prueba' })
            }
        })
    }

    const days = [
        { key: 'mondayTime', label: 'Lunes' },
        { key: 'tuesdayTime', label: 'Martes' },
        { key: 'wednesdayTime', label: 'Miércoles' },
        { key: 'thursdayTime', label: 'Jueves' },
        { key: 'fridayTime', label: 'Viernes' },
        { key: 'saturdayTime', label: 'Sábado' },
        { key: 'sundayTime', label: 'Domingo' },
    ]

    return (
        <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-sky-100 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 rounded-lg">
                        <Bell size={20} />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Notificaciones Telegram</h2>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">Recibe tu resumen de tareas cada mañana</p>
                    </div>
                </div>
                <button
                    onClick={() => setShowHelp(!showHelp)}
                    className="text-sm flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline"
                    type="button"
                >
                    <HelpCircle size={16} />
                    {showHelp ? 'Ocultar Ayuda' : '¿Cómo configurar?'}
                </button>
            </div>

            {/* Help Section */}
            {showHelp && (
                <div className="mx-6 mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20 text-sm space-y-3">
                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
                        <Bot size={16} /> Configurando tu Bot de Telegram
                    </h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <p className="font-medium mb-1">Paso 1: Crear el Bot</p>
                            <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                                <li>Abre Telegram y busca <strong>@BotFather</strong>.</li>
                                <li>Envía el comando <code>/newbot</code>.</li>
                                <li>Sigue las instrucciones para ponerle nombre.</li>
                                <li>Al final te dará un <strong>Token</strong> (HTTP API access token). Cópialo.</li>
                            </ol>
                        </div>
                        <div>
                            <p className="font-medium mb-1">Paso 2: Obtener tu Chat ID</p>
                            <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
                                <li>Abre un chat con tu nuevo bot y dale a <strong>Iniciar</strong>.</li>
                                <li>Busca <strong>@userinfobot</strong> en Telegram.</li>
                                <li>Dale a Iniciar y te dirá tu <strong>Id</strong> numérico.</li>
                                <li>Copia ese número en el campo "Chat ID".</li>
                            </ol>
                        </div>
                    </div>
                </div>
            )}

            <form action={handleSubmit} className="p-6 space-y-8">
                {/* Config */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 mb-4">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="enabled"
                                    defaultChecked={settings?.enabled}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-indigo-600"></div>
                                <span className="ml-3 text-sm font-medium text-zinc-900 dark:text-zinc-300">Activar Notificaciones</span>
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Telegram Chat ID
                            </label>
                            <div className="relative">
                                <MessageSquare className="absolute left-3 top-2.5 text-zinc-400" size={18} />
                                <input
                                    type="text"
                                    name="telegramChatId"
                                    defaultValue={settings?.telegramChatId || ''}
                                    placeholder="Ej: 123456789"
                                    className="w-full pl-10 pr-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                Bot Token (Opcional)
                            </label>
                            <input
                                type="text"
                                name="telegramBotToken"
                                defaultValue={settings?.telegramBotToken || ''}
                                placeholder="Dejar vacío para usar el Bot del sistema"
                                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all dark:text-white text-sm"
                            />
                            <p className="text-xs text-zinc-500 mt-1">Si dejas este campo vacío, se usará el Token configurado en el servidor.</p>
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="space-y-4">
                        <label className="block text-sm font-medium text-zinc-900 dark:text-white mb-2">
                            Horario de Envío
                        </label>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                            {days.map(day => (
                                <div key={day.key} className="flex items-center justify-between">
                                    <span className="text-sm text-zinc-600 dark:text-zinc-400">{day.label}</span>
                                    <input
                                        type="time"
                                        name={day.key}
                                        defaultValue={settings?.[day.key] || '08:00'}
                                        className="px-2 py-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-md text-sm focus:border-indigo-500 outline-none dark:text-white"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-200 dark:border-zinc-800">
                    <button
                        type="button"
                        onClick={handleTest}
                        disabled={isTestPending}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors text-sm font-medium"
                    >
                        {isTestPending ? 'Enviando...' : (
                            <>
                                <Send size={16} /> Probar Bot
                            </>
                        )}
                    </button>

                    <div className="flex items-center gap-4">
                        {message && (
                            <span className={`text-sm ${message.type === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                                {message.text}
                            </span>
                        )}
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-sm shadow-indigo-500/20 transition-all text-sm font-medium"
                        >
                            {isPending ? 'Guardando...' : (
                                <>
                                    <Save size={16} /> Guardar Cambios
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}
