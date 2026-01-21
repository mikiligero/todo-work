'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'

export async function exportData() {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    const user = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!user?.isAdmin) return { error: 'Forbidden' }

    const [users, projects, tasks] = await Promise.all([
        prisma.user.findMany({
            // Include password for restoration purposes
            select: {
                id: true, username: true, password: true, isAdmin: true, createdAt: true
            }
        }),
        prisma.project.findMany(),
        prisma.task.findMany({
            include: {
                subtasks: true
            }
        })
    ])

    return {
        version: 2, // Bump version
        timestamp: new Date().toISOString(),
        users,
        projects,
        tasks
    }
}

export async function importData(jsonData: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    const currentUser = await prisma.user.findUnique({ where: { id: session.userId } })
    if (!currentUser?.isAdmin) return { error: 'Forbidden' }

    try {
        const data = JSON.parse(jsonData)

        // Basic validation
        if (!data.users || (!data.projects && !data.categories) || !data.tasks) {
            return { error: 'Invalid backup file format' }
        }

        // Handle migration from categories -> projects if needed
        const projectsData = data.projects || data.categories

        // We use a transaction to ensure integrity
        await prisma.$transaction(async (tx) => {
            // 1. Restore Users
            for (const u of data.users) {
                await tx.user.upsert({
                    where: { id: u.id },
                    update: {
                        username: u.username,
                        password: u.password,
                        isAdmin: u.isAdmin,
                        createdAt: new Date(u.createdAt)
                    },
                    create: {
                        id: u.id,
                        username: u.username,
                        password: u.password,
                        isAdmin: u.isAdmin,
                        createdAt: new Date(u.createdAt)
                    }
                })
            }

            // 2. Restore Projects (formerly Categories)
            for (const p of projectsData) {
                await tx.project.upsert({
                    where: { id: p.id },
                    update: {
                        name: p.name,
                        color: p.color,
                        ownerId: p.ownerId
                    },
                    create: {
                        id: p.id,
                        name: p.name,
                        color: p.color,
                        ownerId: p.ownerId
                    }
                })
            }

            // 3. Restore Tasks & Subtasks
            for (const t of data.tasks) {
                const { subtasks, ...taskData } = t

                // Migrate completed -> status if needed
                let status = t.status
                if (!status && t.completed !== undefined) {
                    status = t.completed ? 'DONE' : 'TODO'
                }

                // Migrate categoryId -> projectId
                const projectId = t.projectId || t.categoryId

                await tx.task.upsert({
                    where: { id: t.id },
                    update: {
                        title: t.title,
                        description: t.description,
                        status: status || 'TODO',
                        importance: t.importance,
                        dueDate: t.dueDate ? new Date(t.dueDate) : null,
                        projectId: projectId,
                        creatorId: t.creatorId,
                        assigneeId: t.assigneeId,
                        isRecurring: t.isRecurring,
                        recurrenceInterval: t.recurrenceInterval,
                        recurrenceWeekDays: t.recurrenceWeekDays,
                        recurrenceDayOfMonth: t.recurrenceDayOfMonth,
                        recurrenceEndDate: t.recurrenceEndDate ? new Date(t.recurrenceEndDate) : null,
                        reminder: t.reminder ? new Date(t.reminder) : null,
                        createdAt: t.createdAt ? new Date(t.createdAt) : undefined
                    },
                    create: {
                        id: t.id,
                        title: t.title,
                        description: t.description,
                        status: status || 'TODO',
                        importance: t.importance,
                        dueDate: t.dueDate ? new Date(t.dueDate) : null,
                        projectId: projectId,
                        creatorId: t.creatorId,
                        assigneeId: t.assigneeId,
                        isRecurring: t.isRecurring,
                        recurrenceInterval: t.recurrenceInterval,
                        recurrenceWeekDays: t.recurrenceWeekDays,
                        recurrenceDayOfMonth: t.recurrenceDayOfMonth,
                        recurrenceEndDate: t.recurrenceEndDate ? new Date(t.recurrenceEndDate) : null,
                        reminder: t.reminder ? new Date(t.reminder) : null,
                        createdAt: t.createdAt ? new Date(t.createdAt) : undefined
                    }
                })

                if (subtasks && Array.isArray(subtasks)) {
                    for (const st of subtasks) {
                        await tx.subTask.upsert({
                            where: { id: st.id },
                            update: {
                                title: st.title,
                                completed: st.completed
                            },
                            create: {
                                id: st.id,
                                title: st.title,
                                completed: st.completed,
                                taskId: t.id
                            }
                        })
                    }
                }
            }
        })

        return { success: true }
    } catch (e) {
        console.error('Import error:', e)
        return { error: 'Failed to import data: ' + (e as Error).message }
    }
}
