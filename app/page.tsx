import { getSession } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCategories } from '@/app/actions/categories'
import { getPendingTasks } from '@/app/actions/tasks'
import { getUsersForSharing } from '@/app/actions/users'
import { TaskItem } from '@/components/TaskItem'
import { ActionFab } from '@/components/ActionFab'
import prisma from '@/lib/prisma'
import { Sidebar } from '@/components/Sidebar'
import { Settings, Shield } from 'lucide-react'
import { CategoryCard } from '@/components/CategoryCard'
import { AutoRefresh } from '@/components/AutoRefresh'


async function getUser(userId: string) {
  return await prisma.user.findUnique({ where: { id: userId } })
}

export default async function Home() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const [user, categories, tasks, allUsers] = await Promise.all([
    getUser(session.userId),
    getCategories(),
    getPendingTasks(),
    getUsersForSharing()
  ])

  if (!user) redirect('/login')

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar user={user} categories={categories} allUsers={allUsers} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-32">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Good Morning, {user.username}!</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                You have <span className="font-semibold text-indigo-600 dark:text-indigo-400">{tasks.length}</span> pending tasks today.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:border-indigo-500 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition-all flex items-center gap-2 px-4"
                  title="Configuration / Admin"
                >
                  <Settings size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Config</span>
                </Link>
              )}
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel: Pending Tasks */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Pending Tasks</h2>
                {/* Filter controls could go here */}
              </div>

              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    <p className="text-zinc-500">No pending tasks. Enjoy your day!</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    <TaskItem key={task.id} task={task} categories={categories} allUsers={allUsers} currentUserId={user.id} />
                  ))
                )}
              </div>
            </div>

            {/* Right Panel: Categories Summary */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Overview</h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Virtual Shared Category */}
                {tasks.some(t => t.creatorId !== user.id) && (
                  <CategoryCard
                    cat={{
                      id: 'shared-virtual',
                      name: 'Shared with me',
                      color: '#6366f1', // Indigo-500
                      ownerId: 'system',
                      _count: { tasks: tasks.filter(t => t.creatorId !== user.id).length },
                      tasks: tasks.filter(t => t.creatorId !== user.id)
                    } as any}
                    allCategories={categories}
                    currentUserId={user.id}
                  />
                )}

                {categories.map(cat => (
                  <CategoryCard key={cat.id} cat={cat} allCategories={categories} currentUserId={user.id} />
                ))}
                {categories.length === 0 && (
                  <div className="col-span-2 text-sm text-zinc-500 text-center py-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg">
                    No categories yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <ActionFab categories={categories} />
      <AutoRefresh />
    </div>
  )
}
