import { getSession } from '@/lib/auth-utils'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getProjectWithTasks, getProjects } from '@/app/actions/projects'
import { getSharedTasks, getSuggestedAssignees } from '@/app/actions/tasks'
import { TaskItem } from '@/components/TaskItem'
import { ActionFab } from '@/components/ActionFab'
import { Sidebar } from '@/components/Sidebar'
import { ChevronLeft, ListTodo, Users, CheckCircle2 } from 'lucide-react'
import { ProjectHeaderActions } from '@/components/ProjectHeaderActions'
import { ClearCompletedButton } from '@/components/ClearCompletedButton'
import { AutoRefresh } from '@/components/AutoRefresh'
import { KanbanBoard } from '@/components/KanbanBoard' // New import
import prisma from '@/lib/prisma'

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session?.userId) redirect('/login')

    const [project, allProjects, user, allUsers] = await Promise.all([
        id === 'shared-virtual' ? getSharedTasks() : getProjectWithTasks(id),
        getProjects(),
        prisma.user.findUnique({ where: { id: session.userId } }),
        getSuggestedAssignees()
    ])

    if (!project || !user) notFound()

    const proj = project as any
    // Update logic: Active if status != DONE
    const activeTasks = proj.tasks.filter((t: any) => t.status !== 'DONE')
    const completedTasks = proj.tasks.filter((t: any) => t.status === 'DONE')

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
            <Sidebar user={user} projects={allProjects} allUsers={allUsers} />

            <main className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto p-4 md:p-8 pb-32">
                    <header className="mb-8">
                        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-indigo-600 mb-4 transition-colors">
                            <ChevronLeft size={16} />
                            Back to Dashboard
                        </Link>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: proj.color }}></div>
                                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{proj.name}</h1>
                            </div>
                            {proj.ownerId === user.id && proj.id !== 'shared-virtual' && (
                                <ProjectHeaderActions project={proj} allUsers={allUsers} />
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                            {proj.owner && proj.ownerId !== 'system' && proj.ownerId !== user.id && (
                                <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 w-fit">
                                    <Users size={14} />
                                    Shared by @{proj.owner.username}
                                </div>
                            )}
                            {proj.ownerId === user.id && proj.sharedWith && proj.sharedWith.length > 0 && (
                                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 w-fit">
                                    <Users size={14} />
                                    Shared with {proj.sharedWith.map((u: any) => `@${u.username}`).join(', ')}
                                </div>
                            )}
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                            {activeTasks.length} active tasks · {completedTasks.length} completed
                        </p>
                    </header>

                    <div className="h-full">
                        {/* Kanban Board */}
                        <KanbanBoard
                            tasks={proj.tasks}
                            columns={proj.columns}
                            projects={allProjects}
                            allUsers={allUsers}
                            currentUserId={user.id}
                            projectId={proj.id}
                            isOwner={proj.ownerId === user.id}
                        />

                        {/* Clear Completed Button - positioned below or optionally we can move it to header */}
                        {completedTasks.length > 0 && (
                            <div className="mt-4 flex justify-end">
                                <ClearCompletedButton projectId={proj.id} />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <ActionFab projects={allProjects} />
            <AutoRefresh />
        </div>
    )
}
