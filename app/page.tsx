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
import { ProjectCard } from '@/components/ProjectCard'
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

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-32">
          <header className="mb-8 flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">¡Buenos días, {user.username}!</h1>
              <p className="text-zinc-500 dark:text-zinc-400 mt-1">
                Tienes <span className="font-semibold text-indigo-600 dark:text-indigo-400">{tasks.length}</span> tareas activas para hoy.
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

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Panel: Pending Tasks */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Tareas Activas</h2>
                {/* Filter controls could go here */}
              </div>

              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700">
                    <p className="text-zinc-500">No hay tareas activas. ¡Disfruta de tu día!</p>
                  </div>
                ) : (
                  tasks.map(task => (
                    <TaskItem key={task.id} task={task} projects={projects} allUsers={allUsers} currentUserId={user.id} showProjectTag={true} />
                  ))
                )}
              </div>
            </div>

            {/* Right Panel: Projects Summary */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Proyectos</h2>
              <div className="grid grid-cols-2 gap-3">
                {/* Virtual Shared Project */}
                {tasks.some(t => t.creatorId !== user.id) && (
                  <ProjectCard
                    project={{
                      id: 'shared-virtual',
                      name: 'Compartidos conmigo',
                      color: '#6366f1', // Indigo-500
                      ownerId: 'system',
                      _count: { tasks: tasks.filter(t => t.creatorId !== user.id).length },
                      tasks: tasks.filter(t => t.creatorId !== user.id)
                    } as any}
                    allProjects={projects}
                    currentUserId={user.id}
                  />
                )}

                {projects.map(proj => (
                  <ProjectCard key={proj.id} project={proj} allProjects={projects} currentUserId={user.id} />
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
      </main>

      <ActionFab projects={projects} allUsers={allUsers} />
      <AutoRefresh />
    </div>
  )
}
