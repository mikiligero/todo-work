import { getSession } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import prisma from '@/lib/prisma'
import { getUsers, createUser } from '@/app/actions/admin'
import Link from 'next/link'
import { ArrowLeft, UserPlus, Shield } from 'lucide-react'
import { AdminCreateUserForm, AdminUserList, ExportDataButton, ImportDataButton } from '@/components/AdminComponents'
import { NotificationSettingsForm } from '@/components/NotificationSettingsForm'
import { getNotificationSettings } from '@/app/actions/notifications'

export default async function AdminPage() {
    const session = await getSession()
    if (!session?.userId) redirect('/login')

    const currentUser = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!currentUser?.isAdmin) redirect('/')

    const [users, notificationSettings] = await Promise.all([
        getUsers(),
        getNotificationSettings()
    ])

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Link href="/" className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className="text-3xl font-bold text-zinc-900 dark:text-white flex items-center gap-3">
                        <Shield className="text-indigo-600 dark:text-indigo-400" />
                        Admin Dashboard
                    </h1>
                    <div className="ml-auto flex gap-2">
                        <ImportDataButton />
                        <ExportDataButton />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* User List */}
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6">
                        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white">Users</h2>
                        <AdminUserList users={users} />
                    </div>

                    {/* Create User */}
                    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-zinc-200 dark:border-zinc-800 p-6 h-fit">
                        <h2 className="text-xl font-semibold mb-4 text-zinc-900 dark:text-white flex items-center gap-2">
                            <UserPlus size={20} />
                            Create User
                        </h2>
                        <AdminCreateUserForm />
                    </div>
                </div>

                {/* Notification Settings */}
                <NotificationSettingsForm settings={notificationSettings} />
            </div>
        </div>
    )
}
