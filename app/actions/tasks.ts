'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'


export async function getActiveTasks() {
    const session = await getSession()
    if (!session?.userId) return []

    const tasks = await prisma.task.findMany({
        where: {
            OR: [
                { creatorId: session.userId },
                { assigneeId: session.userId },
                { sharedWith: { some: { id: session.userId } } },
                { project: { sharedWith: { some: { id: session.userId } } } },
                { project: { ownerId: session.userId } }
            ],
            status: { not: 'DONE' },
        },
        include: {
            project: {
                include: { columns: { orderBy: { order: 'asc' } } }
            },
            subtasks: {
                orderBy: { createdAt: 'asc' }
            },
            sharedWith: {
                select: {
                    id: true,
                    username: true
                }
            },
            creator: {
                select: {
                    username: true
                }
            },
            assignee: {
                select: {
                    id: true,
                    username: true
                }
            },
            logs: {
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: { username: true }
                    }
                }
            },
            tags: true
        },
        orderBy: {
            dueDate: 'asc'
        }
    })

    const importanceMap: Record<string, number> = { 'High': 1, 'Medium': 2, 'Low': 3 }
    const statusOrder: Record<string, number> = { 'BACKLOG': 4, 'TODO': 1, 'IN_PROGRESS': 0, 'REVIEW': 2, 'DONE': 3 }

    const sortReferenceDate = new Date()
    sortReferenceDate.setHours(0, 0, 0, 0)
    const nextWeek = new Date(sortReferenceDate)
    nextWeek.setDate(sortReferenceDate.getDate() + 7)

    return tasks.sort((a, b) => {
        // 0. Sort by Status Priority
        const sA = statusOrder[a.status] || 99
        const sB = statusOrder[b.status] || 99
        if (sA !== sB) return sA - sB

        // Helper to get group: 1 = Next 7 Days, 2 = No Date, 3 = Future
        const getGroup = (t: typeof tasks[0]) => {
            if (!t.dueDate) return 2
            return new Date(t.dueDate) <= nextWeek ? 1 : 3
        }

        const groupA = getGroup(a)
        const groupB = getGroup(b)

        if (groupA !== groupB) return groupA - groupB

        // Within group:
        // 1. Sort by Date (asc)
        if (a.dueDate && b.dueDate) {
            const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            if (dateDiff !== 0) return dateDiff
        }

        // 2. Tie breaker: Importance (High > Medium > Low)
        const pA = importanceMap[a.importance] || 2
        const pB = importanceMap[b.importance] || 2
        return pA - pB
    })
}

export async function createTask(formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    const title = formData.get('title') as string
    const projectId = formData.get('projectId') as string
    const importance = formData.get('importance') as string
    const status = formData.get('status') as string
    const dueDateStr = formData.get('dueDate') as string

    if (!title || !projectId || projectId === "") return { error: 'El proyecto es obligatorio' }

    try {
        let finalColumnId = formData.get('columnId') as string || null

        // If no column ID provided, try to find the first column of project
        if (!finalColumnId && (!status || status !== 'BACKLOG')) {
            const firstCol = await prisma.kanbanColumn.findFirst({
                where: { projectId },
                orderBy: { order: 'asc' }
            })
            if (firstCol) {
                finalColumnId = firstCol.id
            }
        }

        await prisma.task.create({
            data: {
                title,
                projectId,
                description: formData.get('description') as string,
                importance: importance || 'Medium',
                status: status || 'TODO',
                columnId: finalColumnId,
                dueDate: dueDateStr ? new Date(dueDateStr) : null,
                creatorId: session.userId,
                // Recurrence
                isRecurring: formData.get('isRecurring') === 'on',
                recurrenceInterval: formData.get('recurrenceInterval') as string,
                recurrenceWeekDays: formData.get('recurrenceWeekDays') as string,
                recurrenceDayOfMonth: formData.get('recurrenceDayOfMonth') ? parseInt(formData.get('recurrenceDayOfMonth') as string) : null,
                recurrenceEndDate: formData.get('recurrenceEndDate') ? new Date(formData.get('recurrenceEndDate') as string) : null,
                assigneeId: formData.get('assigneeId') as string || null,
                assigneeName: formData.get('assigneeName') as string || null,
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Error al crear la tarea' }
    }
}

export async function updateTaskStatus(id: string, statusOrColumnId: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    try {
        // If it looks like a column ID (UUID), treat as column move
        const isColumnId = statusOrColumnId.length > 20 && statusOrColumnId.includes('-')

        if (isColumnId) {
            await prisma.task.update({
                where: { id },
                data: { columnId: statusOrColumnId }
            })
            revalidatePath('/')
            return { success: true }
        }

        // Checks for legacy string status (BACKLOG, etc.)
        const status = statusOrColumnId
        const validStatuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
        if (!validStatuses.includes(status)) return { error: 'Estado no válido' }

        if (status === 'DONE') {
            const task = await prisma.task.findUnique({ where: { id } })
            if (task && task.isRecurring && task.dueDate) {
                // Determine next due date
                let nextDate = new Date(task.dueDate)
                const today = new Date()

                while (nextDate <= today) {
                    if (task.recurrenceInterval === 'daily') {
                        nextDate.setDate(nextDate.getDate() + 1)
                    } else if (task.recurrenceInterval === 'weekly') {
                        if (task.recurrenceWeekDays) {
                            const days = task.recurrenceWeekDays.split(',').map(Number).sort()
                            let found = false
                            for (let i = 1; i <= 14; i++) {
                                nextDate.setDate(nextDate.getDate() + 1)
                                const day = nextDate.getDay()
                                if (days.includes(day)) {
                                    found = true
                                    break
                                }
                            }
                            if (!found) nextDate.setDate(nextDate.getDate() + 1)
                        } else {
                            nextDate.setDate(nextDate.getDate() + 7)
                        }
                    } else if (task.recurrenceInterval === 'monthly') {
                        nextDate.setMonth(nextDate.getMonth() + 1)
                        if (task.recurrenceDayOfMonth) {
                            nextDate.setDate(task.recurrenceDayOfMonth)
                        }
                    } else if (task.recurrenceInterval === 'yearly') {
                        nextDate.setFullYear(nextDate.getFullYear() + 1)
                    } else {
                        nextDate.setDate(nextDate.getDate() + 1)
                    }
                }

                if (task.recurrenceEndDate && nextDate > task.recurrenceEndDate) {
                    await prisma.task.update({ where: { id }, data: { status: 'DONE' } })
                } else {
                    // Reschedule
                    await prisma.task.update({
                        where: { id },
                        data: {
                            dueDate: nextDate,
                            status: 'TODO' // Reset to TODO or Backlog? TODO seems right
                        }
                    })
                }
                revalidatePath('/')
                return { success: true, rescheduled: true }
            }
        }

        await prisma.task.update({
            where: { id },
            data: { status }
        })
        revalidatePath('/')
        return { success: true }

    } catch (e) {
        console.error(e)
        return { error: 'Error al actualizar el estado de la tarea' }
    }
}

export async function createTag(projectId: string, name: string, color: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    if (!name || !color) return { error: 'Nombre y color son obligatorios' }

    try {
        const tag = await prisma.tag.create({
            data: {
                name,
                color,
                projectId
            }
        })
        revalidatePath('/')
        return { success: true, tag }
    } catch (e) {
        return { error: 'Error al crear la etiqueta' }
    }
}

export async function getProjectTags(projectId: string) {
    const session = await getSession()
    if (!session?.userId) return []

    return await prisma.tag.findMany({
        where: { projectId },
        orderBy: { name: 'asc' }
    })
}

export async function updateTask(id: string, formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    const title = formData.get('title') as string
    const projectId = formData.get('projectId') as string
    const importance = formData.get('importance') as string
    const status = formData.get('status') as string
    const dueDateStr = formData.get('dueDate') as string

    // Handle Tags
    const tagsJson = formData.get('tags') as string
    let tagConnect = []
    let tagDisconnect = []

    if (tagsJson) {
        try {
            const tagIds = JSON.parse(tagsJson) as string[]
            // We need to set the tags, so we can use set, but prisma set replaces all.
            // Or we can just use set: tagIds.map(...)
            tagConnect = tagIds.map(tid => ({ id: tid }))
        } catch (e) { }
    }

    if (!title || !projectId) return { error: 'El título y el proyecto son obligatorios' }

    try {
        const data: any = {
            title,
            projectId,
            description: formData.get('description') as string,
            importance: importance || 'Medium',
            status: status || 'TODO',
            columnId: formData.get('columnId') as string || null,
            dueDate: dueDateStr ? new Date(dueDateStr) : null,
            isRecurring: formData.get('isRecurring') === 'on',
            recurrenceInterval: formData.get('recurrenceInterval') as string,
            recurrenceWeekDays: formData.get('recurrenceWeekDays') as string,
            recurrenceDayOfMonth: formData.get('recurrenceDayOfMonth') ? parseInt(formData.get('recurrenceDayOfMonth') as string) : null,
            recurrenceEndDate: formData.get('recurrenceEndDate') ? new Date(formData.get('recurrenceEndDate') as string) : null,
            assigneeId: formData.get('assigneeId') as string || null,
            assigneeName: formData.get('assigneeName') as string || null,
        }

        if (tagsJson) {
            data.tags = {
                set: tagConnect
            }
        }

        await prisma.task.update({
            where: { id },
            data
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Error al actualizar la tarea' }
    }
}

export async function deleteTask(id: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    try {
        await prisma.task.delete({
            where: { id }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Error al eliminar la tarea' }
    }
}

export async function getSuggestedAssignees() {
    const session = await getSession()
    if (!session?.userId) return []

    // Get unique custom names from tasks
    const tasks = await prisma.task.findMany({
        where: {
            creatorId: session.userId,
            assigneeName: { not: null }
        },
        select: { assigneeName: true },
        distinct: ['assigneeName']
    })

    const customNames = tasks
        .map(t => t.assigneeName)
        .filter((name): name is string => !!name)

    // Get registered users (including self)
    const users = await prisma.user.findMany({
        select: { id: true, username: true }
    })

    const userSuggestions = users.map(u => ({
        id: u.id,
        username: u.username,
        type: 'user'
    }))

    const customSuggestions = customNames.map(name => ({
        id: name,
        username: name,
        type: 'custom'
    }))

    // Combine and deduplicate if a custom name matches a username
    const combined = [...userSuggestions]
    customSuggestions.forEach(custom => {
        if (!combined.some(u => u.username.toLowerCase() === custom.username.toLowerCase())) {
            combined.push(custom as any)
        }
    })

    return combined
}

export async function shareTask(taskId: string, username: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    try {
        const userToShare = await prisma.user.findUnique({
            where: { username }
        })

        if (!userToShare) return { error: 'Usuario no encontrado' }

        await prisma.task.update({
            where: { id: taskId },
            data: {
                sharedWith: {
                    connect: { id: userToShare.id }
                }
            }
        })
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (e) {
        return { error: 'Error al compartir la tarea' }
    }
}

export async function unshareTask(taskId: string, userIdToUnshare: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    try {
        await prisma.task.update({
            where: { id: taskId },
            data: {
                sharedWith: {
                    disconnect: { id: userIdToUnshare }
                }
            }
        })
        revalidatePath('/', 'layout')
        return { success: true }
    } catch (e) {
        return { error: 'Error al dejar de compartir la tarea' }
    }
}

export async function getSharedTasks() {
    const session = await getSession()
    if (!session?.userId) return null

    const tasks = await prisma.task.findMany({
        where: {
            OR: [
                { sharedWith: { some: { id: session.userId } } },
                {
                    project: { sharedWith: { some: { id: session.userId } } },
                    NOT: { creatorId: session.userId }
                }
            ]
        },
        include: {
            project: {
                include: { columns: { orderBy: { order: 'asc' } } }
            },
            subtasks: {
                orderBy: { createdAt: 'asc' }
            },
            sharedWith: {
                select: {
                    id: true,
                    username: true
                }
            },
            creator: {
                select: {
                    username: true
                }
            }
        }
    })

    const importanceMap: Record<string, number> = { 'High': 1, 'Medium': 2, 'Low': 3 }
    const statusOrder: Record<string, number> = { 'BACKLOG': 4, 'TODO': 1, 'IN_PROGRESS': 0, 'REVIEW': 2, 'DONE': 3 }

    const sortReferenceDate = new Date()
    sortReferenceDate.setHours(0, 0, 0, 0)
    const nextWeek = new Date(sortReferenceDate)
    nextWeek.setDate(sortReferenceDate.getDate() + 7)

    const sortedTasks = tasks.sort((a, b) => {
        // 1. Sort by Status Priority
        const sA = statusOrder[a.status] || 99
        const sB = statusOrder[b.status] || 99
        if (sA !== sB) return sA - sB

        // Helper to get group
        const getGroup = (t: typeof tasks[0]) => {
            if (!t.dueDate) return 2
            return new Date(t.dueDate) <= nextWeek ? 1 : 3
        }

        const groupA = getGroup(a)
        const groupB = getGroup(b)

        if (groupA !== groupB) return groupA - groupB

        // Within group:
        // 1. Sort by Date (asc)
        if (a.dueDate && b.dueDate) {
            const dateDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
            if (dateDiff !== 0) return dateDiff
        }

        // 2. Tie breaker: Importance
        const pA = importanceMap[a.importance] || 2
        const pB = importanceMap[b.importance] || 2
        return pA - pB
    })

    return {
        id: 'shared-virtual',
        name: 'Compartidos conmigo',
        color: '#6366f1',
        ownerId: 'system',
        tasks: sortedTasks,
        _count: { tasks: sortedTasks.length }
    }
}

export async function deleteCompletedTasks(projectId: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'No autorizado' }

    try {
        if (projectId === 'shared-virtual') {
            await prisma.task.deleteMany({
                where: {
                    status: 'DONE',
                    OR: [
                        { sharedWith: { some: { id: session.userId } } },
                        { project: { sharedWith: { some: { id: session.userId } } } }
                    ],
                    NOT: { creatorId: session.userId }
                }
            })
        } else {
            await prisma.task.deleteMany({
                where: {
                    projectId,
                    status: 'DONE',
                }
            })
        }
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Error al eliminar las tareas completadas' }
    }
}
