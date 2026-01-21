'use client'

import { useState } from 'react'
import { updateProject, deleteProject } from '@/app/actions/projects'
import { X, Trash2, Users, CheckCircle2 } from 'lucide-react'

export function ProjectSettingsModal({ project, onClose, allUsers }: { project: any, onClose: () => void, allUsers?: any[] }) {
    const [loading, setLoading] = useState(false)
    const [sharedWith, setSharedWith] = useState<any[]>(project.sharedWith || [])

    function toggleUser(user: any) {
        if (sharedWith.find(u => u.id === user.id)) {
            setSharedWith(sharedWith.filter(u => u.id !== user.id))
        } else {
            setSharedWith([...sharedWith, { id: user.id, username: user.username }])
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        formData.append('sharedWithIds', JSON.stringify(sharedWith.map(u => u.id)))

        await updateProject(project.id, formData)
        setLoading(true)
        onClose()
    }

    async function handleDelete() {
        if (confirm('Are you sure you want to delete this project? Tasks will be deleted.')) {
            setLoading(true)
            await deleteProject(project.id)
            setLoading(false)
            onClose()
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl p-0 overflow-hidden relative animate-in zoom-in-95 duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Edit Project</h2>
                        <div className="flex gap-2">
                            <button onClick={handleDelete} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded-lg transition-colors" title="Delete Project">
                                <Trash2 size={18} />
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-600 dark:text-zinc-400 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Project Name</label>
                                <input
                                    name="name"
                                    defaultValue={project.name}
                                    required
                                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">Color Theme</label>
                                <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2">
                                    <input
                                        name="color"
                                        type="color"
                                        defaultValue={project.color}
                                        className="h-8 w-12 p-0 border-0 rounded cursor-pointer bg-transparent"
                                    />
                                    <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 uppercase">{project.color}</span>
                                </div>
                            </div>
                        </div>

                        {allUsers && allUsers.length > 0 && (
                            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                                <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Users size={14} className="text-indigo-500" />
                                    Share Project
                                </h3>

                                <div className="flex flex-wrap gap-2">
                                    {allUsers.map((u: any) => {
                                        const isShared = sharedWith.some((su: any) => su.id === u.id);
                                        return (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => toggleUser(u)}
                                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-md flex items-center gap-2 group border-2 ${isShared
                                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-indigo-500/30'
                                                    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-indigo-400'
                                                    } ${isShared ? 'scale-[1.02]' : 'scale-100'}`}
                                            >
                                                {isShared ? (
                                                    <CheckCircle2 size={16} className="text-white fill-white/20" />
                                                ) : (
                                                    <Users size={16} className="text-zinc-400 group-hover:text-indigo-500" />
                                                )}
                                                {u.username}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="pt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 text-sm font-semibold text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2.5 text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
