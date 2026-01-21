'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Settings, Shield, Edit2, LogOut } from 'lucide-react'
import { ProjectSettingsModal } from './ProjectSettingsModal'
import { logout } from '@/app/actions/auth'

interface SidebarProps {
    user: any
    projects: any[]
    allUsers?: any[]
}

export function Sidebar({ user, projects, allUsers }: SidebarProps) {
    const [editingProject, setEditingProject] = useState<any>(null)

    return (
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 hidden md:flex flex-col">
            <div className="flex items-center gap-2 mb-6 px-2">
                <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg" />
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Todo Work</h2>
            </div>
            <nav className="space-y-1 flex-1">
                <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium">
                    Dashboard
                </Link>

                <div className="pt-6 pb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex justify-between items-center">
                    <span>Projects</span>
                </div>
                <div className="space-y-0.5">
                    {projects.map(proj => (
                        <div key={proj.id} className="flex items-center gap-2 group w-full px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: proj.color }}></div>
                            <Link href={`/project/${proj.id}`} className="truncate flex-1 hover:text-zinc-900 dark:hover:text-white transition-colors">
                                {proj.name}
                            </Link>
                            {proj._count?.tasks > 0 && (
                                <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full text-zinc-600 dark:text-zinc-300">
                                    {proj._count.tasks}
                                </span>
                            )}
                            {proj.ownerId === user.id && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        setEditingProject(proj)
                                    }}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-zinc-400 hover:text-indigo-600 transition-all rounded-md"
                                >
                                    <Edit2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            </nav>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 space-y-2">

                <div className="flex items-center gap-3 px-3 py-2 mt-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm">
                        {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="text-sm font-medium text-zinc-900 dark:text-white truncate flex-1">
                        {user.username}
                    </div>
                </div>
                <button
                    onClick={() => logout()}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-zinc-500 hover:text-red-600 transition-colors text-sm"
                >
                    <LogOut size={16} />
                    Logout
                </button>
            </div>

            {editingProject && (
                <ProjectSettingsModal
                    project={editingProject}
                    allUsers={allUsers}
                    onClose={() => setEditingProject(null)}
                />
            )}
        </aside>
    )
}
