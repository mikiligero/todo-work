'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Settings, Shield, Edit2, LogOut, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react'
import { ProjectSettingsModal } from './ProjectSettingsModal'
import { logout } from '@/app/actions/auth'

interface SidebarProps {
    user: any
    projects: any[]
    allUsers?: any[]
}

export function Sidebar({ user, projects, allUsers }: SidebarProps) {
    const [editingProject, setEditingProject] = useState<any>(null)
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        const saved = localStorage.getItem('sidebar-collapsed')
        if (saved !== null) {
            setIsCollapsed(JSON.parse(saved))
        }
        setIsLoaded(true)
    }, [])

    const toggleCollapse = () => {
        const newVal = !isCollapsed
        setIsCollapsed(newVal)
        localStorage.setItem('sidebar-collapsed', JSON.stringify(newVal))
    }

    return (
        <aside className={`${isCollapsed ? 'w-20' : 'w-64'} border-r border-zinc-200 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900 hidden md:flex flex-col transition-all duration-300 ease-in-out`}>
            <div className={`flex items-center gap-2 mb-6 px-2 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!isCollapsed && (
                    <div className="flex items-center gap-2 overflow-hidden animate-in fade-in duration-300">
                        <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg shrink-0" />
                        <h2 className="text-xl font-bold text-zinc-900 dark:text-white truncate">Todo Work</h2>
                    </div>
                )}
                {isCollapsed && (
                    <img src="/icon.png" alt="Logo" className="w-8 h-8 rounded-lg animate-in zoom-in duration-300" />
                )}
                <button
                    onClick={toggleCollapse}
                    className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                    title={isCollapsed ? "Expandir" : "Contraer"}
                >
                    {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                </button>
            </div>
            <nav className="space-y-1 flex-1">
                <Link
                    href="/"
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-100/50 dark:hover:bg-indigo-500/20 transition-all ${isCollapsed ? 'justify-center' : ''}`}
                    title="Dashboard"
                >
                    <LayoutDashboard size={20} className="shrink-0" />
                    {!isCollapsed && <span className="truncate animate-in slide-in-from-left-2 duration-300">Dashboard</span>}
                </Link>

                <div className={`pt-6 pb-2 px-3 text-xs font-semibold text-zinc-500 uppercase tracking-wider flex justify-between items-center ${isCollapsed ? 'justify-center' : ''}`}>
                    {isCollapsed ? <span className="h-px w-full bg-zinc-200 dark:bg-zinc-800" /> : <span>Proyectos</span>}
                </div>
                <div className="space-y-0.5">
                    {projects.map(proj => (
                        <div key={proj.id} className={`flex items-center gap-3 group w-full px-3 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: proj.color }}></div>
                            {!isCollapsed && (
                                <>
                                    <Link href={`/project/${proj.id}`} className="truncate flex-1 hover:text-zinc-900 dark:hover:text-white transition-colors animate-in slide-in-from-left-2 duration-300">
                                        {proj.name}
                                    </Link>
                                    {proj._count?.tasks > 0 && (
                                        <span className="text-[10px] bg-zinc-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded-full text-zinc-600 dark:text-zinc-300 shrink-0">
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
                                </>
                            )}
                            {isCollapsed && proj._count?.tasks > 0 && (
                                <div className="absolute left-14 hidden group-hover:block z-50">
                                    <div className="bg-zinc-900 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                        {proj.name} ({proj._count.tasks})
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </nav>

            <div className={`p-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2 ${isCollapsed ? 'items-center' : ''}`}>
                <div className={`flex items-center gap-3 px-1 py-2 mt-2 ${isCollapsed ? 'justify-center' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-zinc-900 border border-zinc-200 dark:border-zinc-700 shadow-sm shrink-0">
                        {user.username.substring(0, 2).toUpperCase()}
                    </div>
                    {!isCollapsed && (
                        <div className="text-sm font-medium text-zinc-900 dark:text-white truncate flex-1 animate-in slide-in-from-left-2 duration-300">
                            {user.username}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => logout()}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 text-zinc-500 hover:text-red-600 transition-colors text-sm ${isCollapsed ? 'justify-center' : ''}`}
                    title="Cerrar sesión"
                >
                    <LogOut size={16} className="shrink-0" />
                    {!isCollapsed && <span className="animate-in slide-in-from-left-2 duration-300">Cerrar sesión</span>}
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
