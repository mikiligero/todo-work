import { getSession } from '@/lib/auth-utils'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getCategoryWithTasks, getCategories } from '@/app/actions/categories'
import { getSharedTasks } from '@/app/actions/tasks'
import { getUsersForSharing } from '@/app/actions/users'
import { TaskItem } from '@/components/TaskItem'
import { ActionFab } from '@/components/ActionFab'
import { Sidebar } from '@/components/Sidebar'
import { ChevronLeft, ListTodo, CheckCircle2, Users } from 'lucide-react'
import { CategoryHeaderActions } from '@/components/CategoryHeaderActions'
import { ClearCompletedButton } from '@/components/ClearCompletedButton'
import { AutoRefresh } from '@/components/AutoRefresh'
import prisma from '@/lib/prisma'

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const session = await getSession()
    if (!session?.userId) redirect('/login')

    const [category, allCategories, user, allUsers] = await Promise.all([
        id === 'shared-virtual' ? getSharedTasks() : getCategoryWithTasks(id),
        getCategories(),
        prisma.user.findUnique({ where: { id: session.userId } }),
        getUsersForSharing()
    ])

    if (!category || !user) notFound()

    const cat = category as any
    const pendingTasks = cat.tasks.filter((t: any) => !t.completed)
    const completedTasks = cat.tasks.filter((t: any) => t.completed)

    return (
        <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
            <Sidebar user={user} categories={allCategories} allUsers={allUsers} />

            <main className="flex-1 overflow-auto">
                <div className="max-w-5xl mx-auto p-4 md:p-8 pb-32">
                    <header className="mb-8">
                        <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-indigo-600 mb-4 transition-colors">
                            <ChevronLeft size={16} />
                            Back to Dashboard
                        </Link>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded-full shadow-sm" style={{ backgroundColor: cat.color }}></div>
                                <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">{cat.name}</h1>
                            </div>
                            {cat.ownerId === user.id && cat.id !== 'shared-virtual' && (
                                <CategoryHeaderActions category={cat} allUsers={allUsers} />
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 mt-3">
                            {cat.owner && cat.ownerId !== 'system' && cat.ownerId !== user.id && (
                                <div className="flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30 w-fit">
                                    <Users size={14} />
                                    Compartido por @{cat.owner.username}
                                </div>
                            )}
                            {cat.ownerId === user.id && cat.sharedWith && cat.sharedWith.length > 0 && (
                                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-lg border border-emerald-100 dark:border-emerald-900/30 w-fit">
                                    <Users size={14} />
                                    Compartido con {cat.sharedWith.map((u: any) => `@${u.username}`).join(', ')}
                                </div>
                            )}
                        </div>
                        <p className="text-zinc-500 dark:text-zinc-400 mt-2">
                            {pendingTasks.length} pending tasks · {completedTasks.length} completed
                        </p>
                    </header>

                    <div className="space-y-12">
                        {/* Pending Section */}
                        <section>
                            <div className="flex items-center gap-2 mb-4 text-zinc-900 dark:text-white">
                                <ListTodo size={18} className="text-indigo-500" />
                                <h2 className="text-lg font-semibold">Pending</h2>
                            </div>

                            <div className="space-y-3">
                                {pendingTasks.length === 0 ? (
                                    <div className="p-8 text-center bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-500">
                                        No pending tasks in this category.
                                    </div>
                                ) : (
                                    pendingTasks.map((task: any) => <TaskItem key={task.id} task={task} categories={allCategories} allUsers={allUsers} currentUserId={user.id} />)
                                )}
                            </div>
                        </section>

                        {/* Completed Section */}
                        {completedTasks.length > 0 && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2 text-zinc-900 dark:text-white">
                                        <CheckCircle2 size={18} className="text-zinc-400" />
                                        <h2 className="text-lg font-semibold">Completed</h2>
                                    </div>
                                    <ClearCompletedButton categoryId={cat.id} />
                                </div>
                                <div className="space-y-3 opacity-80">
                                    {completedTasks.map((task: any) => <TaskItem key={task.id} task={task} categories={allCategories} allUsers={allUsers} currentUserId={user.id} />)}
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>

            <ActionFab categories={allCategories} />
            <AutoRefresh />
        </div>
    )
}
