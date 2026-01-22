'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Users } from 'lucide-react'
import { CreateTaskModal } from './ActionFab'

export function ProjectCard({ project, allProjects, currentUserId }: { project: any, allProjects: any[], currentUserId?: string }) {
    const [showModal, setShowModal] = useState(false)
    const router = useRouter()

    const isOwner = project.ownerId === currentUserId || project.ownerId === 'system'
    const isSharedWithOthers = project.sharedWith && project.sharedWith.length > 0
    const isSharedByOthers = !isOwner && project.owner

    return (
        <>
            <div
                onClick={() => router.push(`/project/${project.id}`)}
                className="p-4 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group relative cursor-pointer"
            >
                <div className="flex items-start justify-between mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }}></div>
                    <button
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setShowModal(true)
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all"
                        title={`Añadir tarea a ${project.name}`}
                    >
                        <Plus size={16} />
                    </button>
                </div>
                <div className="font-medium text-zinc-900 dark:text-white truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title={project.name}>
                    {project.name}
                </div>

                {isSharedByOthers && (
                    <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1 mt-0.5">
                        <Users size={10} />
                        Prop. de @{project.owner.username}
                    </div>
                )}

                {isOwner && isSharedWithOthers && (
                    <div className="text-[10px] text-emerald-500 truncate flex items-center gap-1 mt-0.5">
                        <Users size={10} />
                        Compartido {project.sharedWith.map((u: any) => `@${u.username}`).join(', ')}
                    </div>
                )}

                <div className="text-xs text-zinc-500 mt-1">{project._count?.tasks ?? 0} activas</div>
            </div>

            {showModal && (
                <CreateTaskModal
                    projects={allProjects}
                    onClose={() => setShowModal(false)}
                    initialProjectId={project.id}
                />
            )}
        </>
    )
}
