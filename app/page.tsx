import { getSession } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getProjects } from '@/app/actions/projects'
import { getActiveTasks, getSuggestedAssignees } from '@/app/actions/tasks'
import { TaskItem } from '@/components/TaskItem'
import { ActionFab } from '@/components/ActionFab'
import prisma from '@/lib/prisma'
import { Sidebar } from '@/components/Sidebar'
import { Settings } from 'lucide-react'
import { DashboardGrid } from '@/components/DashboardGrid'
import { AutoRefresh } from '@/components/AutoRefresh'


async function getUser(userId: string) {
  return await prisma.user.findUnique({ where: { id: userId } })
}

export default async function Home() {
  const session = await getSession()
  if (!session?.userId) redirect('/login')

  const [user, projects, tasks, allUsers] = await Promise.all([
    getUser(session.userId),
    getProjects(),
    getActiveTasks(),
    getSuggestedAssignees()
  ])

  if (!user) {
    redirect('/api/auth/signout')
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950">
      <Sidebar user={user} projects={projects} allUsers={allUsers} />

      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-32">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">¡Buenos días, {user.username}!</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                Tienes <span className="font-semibold text-indigo-600 dark:text-indigo-400">{tasks.length}</span> tareas activas.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:border-indigo-500 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 transition-all flex items-center gap-2 px-4"
                  title="Configuración / Admin"
                >
                  <Settings size={18} />
                  <span className="text-sm font-medium hidden sm:inline">Config</span>
                </Link>
              )}
            </div>
          </header>

          <DashboardGrid tasks={tasks} projects={projects} allUsers={allUsers} currentUserId={user.id} />

        </div>
      </main>

      <ActionFab projects={projects} allUsers={allUsers} />
      <AutoRefresh />
    </div>
  )
}
