'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'


export async function getProjects() {
    const session = await getSession()
    if (!session?.userId) return []

    return await prisma.project.findMany({
        where: {
            OR: [
                { ownerId: session.userId },
                { sharedWith: { some: { id: session.userId } } }
            ]
        },
        include: {
            _count: {
                select: { tasks: { where: { status: { not: 'DONE' } } } }
            },
            sharedWith: {
                select: { id: true, username: true }
            },
            owner: {
                select: { username: true }
            }
        }
    })
}

export async function createProject(formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    const name = formData.get('name') as string
    const color = formData.get('color') as string

    if (!name) return { error: 'El nombre es obligatorio' }

    try {
        await prisma.project.create({
            data: {
                name,
                color: color || '#6366f1', // Default Indigo
                ownerId: session.userId,
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Error al crear el proyecto' }
    }
}

export async function updateProject(id: string, formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    const name = formData.get('name') as string
    const color = formData.get('color') as string
    const sharedWithIdsJson = formData.get('sharedWithIds') as string

    let sharedWithIds: string[] = []
    try {
        sharedWithIds = sharedWithIdsJson ? JSON.parse(sharedWithIdsJson) : []
    } catch (e) {
        // invalid json
    }

    try {
        await prisma.project.update({
            where: {
                id,
                ownerId: session.userId // Only owner can update
            },
            data: {
                name,
                color,
                sharedWith: {
                    set: sharedWithIds.map((uid: string) => ({ id: uid }))
                }
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Error al actualizar el proyecto' }
    }
}

export async function deleteProject(id: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    try {
        // Only owner can delete
        await prisma.project.delete({
            where: {
                id,
                ownerId: session.userId
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Error al eliminar el proyecto' }
    }
}

export async function getProjectWithTasks(id: string) {
    const session = await getSession()
    if (!session?.userId) return null

    const PROJECT_INCLUDE = {
        owner: true,
        sharedWith: true,
        tags: true,
        columns: {
            orderBy: { order: 'asc' } as const
        },
        tasks: {
            include: {
                subtasks: { orderBy: { createdAt: 'asc' } as const },
                creator: true,
                assignee: true,
                sharedWith: true,
                tags: true,
                project: {
                    include: { columns: { orderBy: { order: 'asc' } as const } }
                },
                logs: {
                    orderBy: { createdAt: 'desc' } as const,
                    include: {
                        user: {
                            select: { username: true }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' } as const
        }
    }

    // 1. Fetch project to check permissions and existence
    let project: any = await prisma.project.findUnique({
        where: { id },
        include: PROJECT_INCLUDE
    })

    if (!project) return null

    const isOwner = project.ownerId === session.userId
    const isShared = project.sharedWith.some((u: any) => u.id === session.userId)

    if (!isOwner && !isShared) {
        // Double check admin status if needed
        const user = await prisma.user.findUnique({ where: { id: session.userId } })
        if (!user?.isAdmin) return null
    }

    // 2. Lazy Seed Columns if none exist
    if (project.columns.length === 0) {
        const defaultColumns = ['Backlog', 'Por hacer', 'En curso', 'Revisión', 'Hecho']
        for (let i = 0; i < defaultColumns.length; i++) {
            await prisma.kanbanColumn.create({
                data: {
                    title: defaultColumns[i],
                    projectId: id,
                    order: i
                }
            })
        }
        // Refetch with new columns
        const updatedProject = await prisma.project.findUnique({
            where: { id },
            include: PROJECT_INCLUDE
        })
        if (updatedProject) {
            project = updatedProject
        }
    }

    // 3. Repair Orphaned Tasks (No Column ID or Invalid Column ID)
    const validColumnIds = new Set(project.columns.map((c: any) => c.id))
    const orphanedTasks = project.tasks.filter((t: any) => !t.columnId || !validColumnIds.has(t.columnId))
    if (orphanedTasks.length > 0 && project.columns.length > 0) {
        const firstColId = project.columns[0].id
        await prisma.task.updateMany({
            where: {
                id: { in: orphanedTasks.map((t: any) => t.id) }
            },
            data: {
                columnId: firstColId
            }
        })

        // Refetch project to get updated tasks
        const repairedProject = await prisma.project.findUnique({
            where: { id },
            include: PROJECT_INCLUDE
        })
        if (repairedProject) {
            project = repairedProject
        }
    }

    const importanceMap: Record<string, number> = { 'High': 1, 'Medium': 2, 'Low': 3 }
    const statusOrder: Record<string, number> = { 'BACKLOG': 4, 'TODO': 1, 'IN_PROGRESS': 0, 'REVIEW': 2, 'DONE': 3 }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    // Sort tasks in memory
    project.tasks.sort((a: any, b: any) => {
        // 1. Sort by Status Priority
        const sA = statusOrder[a.status] || 99
        const sB = statusOrder[b.status] || 99
        if (sA !== sB) return sA - sB

        // Helper to get group
        const getGroup = (t: any) => {
            if (!t.dueDate) return 2
            return new Date(t.dueDate) <= nextWeek ? 1 : 3
        }

        const groupA = getGroup(a)
        const groupB = getGroup(b)

        if (groupA !== groupB) return groupA - groupB

        // Within group:
        if (a.dueDate && b.dueDate) {
            const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            if (dateDiff !== 0) return dateDiff
        }

        const pA = importanceMap[a.importance] || 2
        const pB = importanceMap[b.importance] || 2
        return pA - pB
    })

    return project
}
