'use client'

import { useState } from 'react'
import { Plus, X, List, FolderPlus } from 'lucide-react'
import { createTask } from '@/app/actions/tasks'
import { createProject } from '@/app/actions/projects'
import { RecurrenceFields } from './RecurrenceFields'
import { SearchableUserSelect } from './SearchableUserSelect'

// We accept projects as prop to show in dropdown
export function ActionFab({ projects, allUsers }: { projects: any[], allUsers?: any[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [modalMode, setModalMode] = useState<'task' | 'project' | null>(null)

    return (
        <>
            {/* FAB */}
            <div className="fixed bottom-8 right-8 flex flex-col items-end gap-4 z-50">
                {isOpen && (
                    <div className="flex flex-col items-end gap-3 animate-in slide-in-from-bottom-5 fade-in duration-200">
                        <button
                            onClick={() => { setModalMode('project'); setIsOpen(false) }}
                            className="flex items-center gap-3 pr-2 group"
                        >
                            <span className="text-sm font-medium bg-white dark:bg-zinc-800 px-2 py-1 rounded shadow text-zinc-700 dark:text-zinc-200 group-hover:-translate-x-1 transition-transform">
                                New Project
                            </span>
                            <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <FolderPlus size={20} />
                            </div>
                        </button>

                        <button
                            onClick={() => { setModalMode('task'); setIsOpen(false) }}
                            className="flex items-center gap-3 pr-2 group"
                        >
                            <span className="text-sm font-medium bg-white dark:bg-zinc-800 px-2 py-1 rounded shadow text-zinc-700 dark:text-zinc-200 group-hover:-translate-x-1 transition-transform">
                                New Task
                            </span>
                            <div className="w-10 h-10 bg-white dark:bg-zinc-800 rounded-full shadow-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <List size={20} />
                            </div>
                        </button>
                    </div>
                )}

                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${isOpen
                        ? 'bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 rotate-45'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-105'
                        }`}
                >
                    <Plus size={28} />
                </button>
            </div>

            {/* Modals */}
            {modalMode === 'task' && (
                <CreateTaskModal
                    projects={projects}
                    allUsers={allUsers}
                    onClose={() => setModalMode(null)}
                />
            )}

            {modalMode === 'project' && (
                <CreateProjectModal
                    onClose={() => setModalMode(null)}
                />
            )}
        </>
    )
}

export function CreateTaskModal({ projects, allUsers, onClose, initialProjectId }: { projects: any[], allUsers?: any[], onClose: () => void, initialProjectId?: string }) {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        await createTask(formData)
        setLoading(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <X size={20} />
                </button>

                <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">New Task</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Title</label>
                        <input name="title" required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" placeholder="What needs to be done?" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Description</label>
                        <textarea name="description" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2 h-20 resize-none" placeholder="Add more details (optional)..." />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Project</label>
                            <select
                                name="projectId"
                                defaultValue={initialProjectId || ""}
                                required
                                className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2"
                            >
                                <option value="" disabled>Select Project...</option>
                                {projects.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Importance</label>
                            <select name="importance" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" defaultValue="Medium">
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Due Date</label>
                        <input name="dueDate" type="date" className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" />
                    </div>

                    {allUsers && (
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Assignee</label>
                            <SearchableUserSelect users={allUsers} />
                        </div>
                    )}

                    <RecurrenceFields />

                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Create Task</button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function CreateProjectModal({ onClose }: { onClose: () => void }) {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        await createProject(formData)
        setLoading(false)
        onClose()
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-sm shadow-2xl p-6 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
                    <X size={20} />
                </button>
                <h2 className="text-xl font-bold mb-4 text-zinc-900 dark:text-white">New Project</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Name</label>
                        <input name="name" required className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-2" placeholder="e.g. Website Redesign" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Color</label>
                        <input name="color" type="color" defaultValue="#6366f1" className="w-full h-10 p-0 border-0 rounded-lg cursor-pointer" />
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Create Project</button>
                    </div>
                </form>
            </div>
        </div>
    )
}
