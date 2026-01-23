'use client'

import { useState } from 'react'
import { TaskItem } from '@/components/TaskItem'
import { ProjectCard } from '@/components/ProjectCard'
import { startOfDay, endOfDay, addDays, endOfWeek, addWeeks, isBefore, isAfter, isToday, isTomorrow, format, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { AlertTriangle, Calendar, CalendarDays, CalendarClock, List } from 'lucide-react'

interface DashboardGridProps {
    tasks: any[]
    projects: any[]
    allUsers: any[]
    currentUserId: string
}

export function DashboardGrid({ tasks, projects, allUsers, currentUserId }: DashboardGridProps) {
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)
    const endOfTomorrow = endOfDay(tomorrow)
    const endOfCurrentWeek = endOfWeek(today, { weekStartsOn: 1 })
    const startOfNextWeek = addDays(endOfCurrentWeek, 1)
    const endOfNextWeek = endOfWeek(startOfNextWeek, { weekStartsOn: 1 })

    // Categorize Tasks
    const imminentTasks = tasks.filter(t => {
        if (!t.dueDate) return false
        const d = new Date(t.dueDate)
        return isBefore(d, endOfTomorrow) // Overdue + Today + Tomorrow
    })

    const thisWeekTasks = tasks.filter(t => {
        if (!t.dueDate) return false
        const d = new Date(t.dueDate)
        // Strictly after tomorrow BUT inclusive of the rest of the week
        // If today is Sunday, endOfTomorrow is Monday end. endOfCurrentWeek is Sunday.
        // So this set might be empty on weekends, which is correct.
        return isAfter(d, endOfTomorrow) && isBefore(d, endOfCurrentWeek)
    })

    const nextWeekTasks = tasks.filter(t => {
        if (!t.dueDate) return false
        const d = new Date(t.dueDate)
        return isAfter(d, endOfWeek(today, { weekStartsOn: 1 })) && isBefore(d, endOfNextWeek)
    })

    const highPriorityTasks = tasks.filter(t => t.importance === 'High')

    const backlogTasks = tasks.filter(t => {
        if (!t.dueDate) return true
        const d = new Date(t.dueDate)
        return isAfter(d, endOfNextWeek)
    })

    // Calculations for shared project logic
    const sharedTasks = tasks.filter(t => t.creatorId !== currentUserId)

    return (
        <div className="space-y-8">
            {/* High Priority Summary */}
            {highPriorityTasks.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle className="text-red-600 dark:text-red-400" size={20} />
                        <h2 className="text-lg font-bold text-red-700 dark:text-red-400">Prioridad Alta</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {highPriorityTasks.map(task => (
                            <TaskItem
                                key={task.id}
                                task={task}
                                projects={projects}
                                allUsers={allUsers}
                                currentUserId={currentUserId}
                                showProjectTag={true}
                                compact={true}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Panel 1: Hoy y Mañana */}
                <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 h-fit">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <Calendar className="text-indigo-500" size={18} />
                        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Para cerrar Hoy/Mañana</h2>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full ml-auto">
                            {imminentTasks.length}
                        </span>
                    </div>
                    <div className="space-y-3 min-h-[100px]">
                        {imminentTasks.length === 0 ? (
                            <p className="text-sm text-zinc-400 text-center py-8">¡Todo al día!</p>
                        ) : (
                            imminentTasks.map(task => (
                                <TaskItem key={task.id} task={task} projects={projects} allUsers={allUsers} currentUserId={currentUserId} showProjectTag={true} compact={true} />
                            ))
                        )}
                    </div>
                </div>

                {/* Panel 2: Esta Semana */}
                <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 h-fit">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <CalendarDays className="text-violet-500" size={18} />
                        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Resto de la Semana</h2>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full ml-auto">
                            {thisWeekTasks.length}
                        </span>
                    </div>
                    <div className="space-y-3 min-h-[100px]">
                        {thisWeekTasks.length === 0 ? (
                            <p className="text-sm text-zinc-400 text-center py-8">Nada programado aún.</p>
                        ) : (
                            thisWeekTasks.map(task => (
                                <TaskItem key={task.id} task={task} projects={projects} allUsers={allUsers} currentUserId={currentUserId} showProjectTag={true} compact={true} />
                            ))
                        )}
                    </div>
                </div>

                {/* Panel 3: Próxima Semana */}
                <div className="bg-white dark:bg-zinc-900/50 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4 h-fit">
                    <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                        <CalendarClock className="text-fuchsia-500" size={18} />
                        <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Próxima Semana</h2>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full ml-auto">
                            {nextWeekTasks.length}
                        </span>
                    </div>
                    <div className="space-y-3 min-h-[100px]">
                        {nextWeekTasks.length === 0 ? (
                            <p className="text-sm text-zinc-400 text-center py-8">Despejado.</p>
                        ) : (
                            nextWeekTasks.map(task => (
                                <TaskItem key={task.id} task={task} projects={projects} allUsers={allUsers} currentUserId={currentUserId} showProjectTag={true} compact={true} />
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Secondary Grid: Backlog & Projects */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                {/* Backlog/Future */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <List className="text-zinc-400" size={18} />
                        <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Más adelante / Sin fecha</h2>
                        <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 text-xs px-2 py-0.5 rounded-full ml-auto">
                            {backlogTasks.length}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {backlogTasks.length === 0 ? (
                            <p className="text-sm text-zinc-400 pl-2">Lista vacía.</p>
                        ) : (
                            backlogTasks.map(task => (
                                <TaskItem key={task.id} task={task} projects={projects} allUsers={allUsers} currentUserId={currentUserId} showProjectTag={true} compact={true} />
                            ))
                        )}
                    </div>
                </div>

                {/* Projects Summary */}
                <div className="space-y-4">
                    <h2 className="font-semibold text-zinc-700 dark:text-zinc-300">Resumen de Proyectos</h2>
                    <div className="grid grid-cols-2 gap-3">
                        {/* Virtual Shared Project */}
                        {sharedTasks.length > 0 && (
                            <ProjectCard
                                project={{
                                    id: 'shared-virtual',
                                    name: 'Compartidos conmigo',
                                    color: '#6366f1', // Indigo-500
                                    ownerId: 'system',
                                    _count: { tasks: sharedTasks.length },
                                    tasks: sharedTasks
                                } as any}
                                allProjects={projects}
                                currentUserId={currentUserId}
                            />
                        )}

                        {projects.map(proj => (
                            <ProjectCard key={proj.id} project={proj} allProjects={projects} currentUserId={currentUserId} />
                        ))}
                        {projects.length === 0 && (
                            <div className="col-span-2 text-sm text-zinc-500 text-center py-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                                Aún no hay proyectos.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
