'use client'

import { useState, useRef } from 'react'
import { createUser, updateUser, deleteUser } from '@/app/actions/admin'
import { exportData, importData } from '@/app/actions/export'
import { Loader2, Edit2, Trash2, Download, Save, X, UserCog, Upload } from 'lucide-react'

export function AdminCreateUserForm() {
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        setMessage('')

        const formData = new FormData(e.currentTarget)
        const result = await createUser(formData)

        if (result.error) {
            setMessage(result.error)
        } else {
            setMessage('User created successfully')
            e.currentTarget.reset()
        }
        setLoading(false)
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Username</label>
                <input name="username" required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                <input name="password" type="password" required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" />
            </div>

            {message && (
                <div className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
                    {message}
                </div>
            )}

            <button disabled={loading} className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center">
                {loading ? <Loader2 className="animate-spin" size={16} /> : 'Create User'}
            </button>
        </form>
    )
}

export function AdminUserList({ users }: { users: any[] }) {
    const [editingUser, setEditingUser] = useState<any>(null)
    const [deletingId, setDeletingId] = useState<string | null>(null)

    async function handleDelete(id: string) {
        if (!confirm('Are you sure? This action cannot be undone.')) return
        setDeletingId(id)
        await deleteUser(id)
        setDeletingId(null)
    }

    return (
        <div className="space-y-3">
            {users.map(u => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 group">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs">
                            {u.username.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-medium text-zinc-900 dark:text-white flex items-center gap-2">
                                {u.username}
                                {u.isAdmin && <ShieldBadge />}
                            </div>
                            <div className="text-xs text-zinc-500">Created: {new Date(u.createdAt).toISOString().split('T')[0]}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 text-zinc-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                            title="Edit User"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => handleDelete(u.id)}
                            disabled={deletingId === u.id}
                            className="p-1.5 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete User"
                        >
                            {deletingId === u.id ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                        </button>
                    </div>
                </div>
            ))}

            {editingUser && (
                <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
            )}
        </div>
    )
}

function EditUserModal({ user, onClose }: { user: any, onClose: () => void }) {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        await updateUser(user.id, formData)
        setLoading(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white flex items-center gap-2">
                    <UserCog size={20} /> Edit User
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Username</label>
                        <input name="username" defaultValue={user.username} required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">New Password (optional)</label>
                        <input name="password" type="password" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" placeholder="Leave empty to keep current" />
                    </div>

                    <div className="flex items-center gap-2">
                        <input type="checkbox" name="isAdmin" id="isAdmin" defaultChecked={user.isAdmin} className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
                        <label htmlFor="isAdmin" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 select-none">Administrator Access</label>
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

export function ExportDataButton() {
    const [loading, setLoading] = useState(false)

    async function handleExport() {
        setLoading(true)
        const data = await exportData()
        if ('error' in data) {
            alert(data.error)
        } else {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `todo-work-backup-${new Date().toISOString().split('T')[0]}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
        }
        setLoading(false)
    }

    return (
        <button
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg transition-colors font-medium text-sm"
        >
            {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
            Export Data
        </button>
    )
}

export function ImportDataButton() {
    const [loading, setLoading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        if (!confirm('WARNING: Importing data will overwrite existing items with the same ID. Are you sure you want to proceed?')) {
            e.target.value = ''
            return
        }

        setLoading(true)
        try {
            const text = await file.text()
            const result = await importData(text)
            if (result.error) {
                alert(result.error)
            } else {
                alert('Data imported successfully! The page will reload.')
                window.location.reload()
            }
        } catch (err) {
            alert('Failed to read file')
        }
        setLoading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
    }

    return (
        <>
            <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg transition-colors font-medium text-sm"
            >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                Import Data
            </button>
        </>
    )
}

function ShieldBadge() {
    return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
            ADMIN
        </span>
    )
}
