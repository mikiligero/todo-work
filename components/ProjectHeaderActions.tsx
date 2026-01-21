'use client'

import { useState } from 'react'
import { Edit2, Trash2 } from 'lucide-react'
import { ProjectSettingsModal } from './ProjectSettingsModal'
import { deleteProject } from '@/app/actions/projects'
import { useRouter } from 'next/navigation'

export function ProjectHeaderActions({ project, allUsers }: { project: any, allUsers?: any[] }) {
    const [showSettings, setShowSettings] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    async function handleDelete() {
        if (confirm('Are you sure you want to delete this project? All associated tasks will be removed.')) {
            setLoading(true)
            await deleteProject(project.id)
            setLoading(false)
            router.push('/')
        }
    }

    return (
        <>
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:border-indigo-500 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition-all flex items-center gap-2 px-3"
                    title="Edit Project"
                >
                    <Edit2 size={18} />
                    <span className="text-sm font-medium hidden sm:inline">Edit</span>
                </button>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:border-red-500 text-zinc-600 dark:text-zinc-400 hover:text-red-600 transition-all flex items-center gap-2 px-3 disabled:opacity-50"
                    title="Delete Project"
                >
                    <Trash2 size={18} />
                    <span className="text-sm font-medium hidden sm:inline">Delete</span>
                </button>
            </div>

            {showSettings && (
                <ProjectSettingsModal
                    project={project}
                    allUsers={allUsers}
                    onClose={() => setShowSettings(false)}
                />
            )}
        </>
    )
}
