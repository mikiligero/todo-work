'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'


export async function getPendingTasks() {
    const session = await getSession()
    if (!session?.userId) return []

    const today = new Date()
    today.setHours(23, 59, 59, 999)

    const tasks = await prisma.task.findMany({
        where: {
            OR: [
                { creatorId: session.userId },
                { assigneeId: session.userId },
                { sharedWith: { some: { id: session.userId } } },
                { category: { sharedWith: { some: { id: session.userId } } } },
                { category: { ownerId: session.userId } }
            ],
            completed: false,
        },
        include: {
            category: true,
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
        },
        orderBy: {
            dueDate: 'asc'
        }
    })

    const importanceMap: Record<string, number> = { 'High': 1, 'Medium': 2, 'Low': 3 }
    const sortReferenceDate = new Date()
    sortReferenceDate.setHours(0, 0, 0, 0)
    const nextWeek = new Date(sortReferenceDate)
    nextWeek.setDate(sortReferenceDate.getDate() + 7)

    return tasks.sort((a, b) => {
        // Helper to get group: 1 = Next 7 Days, 2 = No Date, 3 = Future
        const getGroup = (t: typeof tasks[0]) => {
            if (!t.dueDate) return 2
            return new Date(t.dueDate) <= nextWeek ? 1 : 3
        }

        const groupA = getGroup(a)
        const groupB = getGroup(b)

        if (groupA !== groupB) return groupA - groupB

        // Within group, sort by Importance
        const pA = importanceMap[a.importance] || 2
        const pB = importanceMap[b.importance] || 2
        if (pA !== pB) return pA - pB

        // Tie breaker: Date (asc)
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        }
        return 0
    })
}

export async function createTask(formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    const title = formData.get('title') as string
    const categoryId = formData.get('categoryId') as string
    const importance = formData.get('importance') as string
    const dueDateStr = formData.get('dueDate') as string

    if (!title || !categoryId || categoryId === "") return { error: 'Category is required' }

    try {
        await prisma.task.create({
            data: {
                title,
                categoryId,
                description: formData.get('description') as string,
                importance: importance || 'Medium',
                dueDate: dueDateStr ? new Date(dueDateStr) : null,
                creatorId: session.userId,
                // Recurrence
                isRecurring: formData.get('isRecurring') === 'on',
                recurrenceInterval: formData.get('recurrenceInterval') as string,
                recurrenceWeekDays: formData.get('recurrenceWeekDays') as string,
                recurrenceDayOfMonth: formData.get('recurrenceDayOfMonth') ? parseInt(formData.get('recurrenceDayOfMonth') as string) : null,
                recurrenceEndDate: formData.get('recurrenceEndDate') ? new Date(formData.get('recurrenceEndDate') as string) : null,
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to create task' }
    }
}

export async function toggleTaskCompletion(id: string, completed: boolean) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        if (completed) {
            const task = await prisma.task.findUnique({ where: { id } })
            if (task && task.isRecurring && task.dueDate) {
                // Determine next due date
                let nextDate = new Date(task.dueDate)
                const today = new Date()

                // If the due date is in the past, we should calculate the next occurrence from TODAY, otherwise from the due date
                // Actually, standard behavior is usually from the due date to keep the schedule, unless it's way behind.
                // Let's stick to generating from the current due date to maintain the pattern (e.g. every Monday)

                // However, to ensure it jumps to the future:
                while (nextDate <= today) {
                    if (task.recurrenceInterval === 'daily') {
                        nextDate.setDate(nextDate.getDate() + 1)
                    } else if (task.recurrenceInterval === 'weekly') {
                        // Simple +7 for now, or use weekDays logic
                        // For MVP, if specific days are set, we find the next match
                        if (task.recurrenceWeekDays) {
                            const days = task.recurrenceWeekDays.split(',').map(Number).sort()
                            // Find next day in the list
                            let found = false
                            // limit lookahead to 2 weeks to avoid infinite loops
                            for (let i = 1; i <= 14; i++) {
                                nextDate.setDate(nextDate.getDate() + 1)
                                const day = nextDate.getDay() // 0-6
                                // Adjust 0 (Sun) to match 7 if needed, but let's assume 0-6 input
                                if (days.includes(day)) {
                                    found = true
                                    break
                                }
                            }
                            if (!found) nextDate.setDate(nextDate.getDate() + 1) // Fallback
                        } else {
                            nextDate.setDate(nextDate.getDate() + 7)
                        }
                    } else if (task.recurrenceInterval === 'monthly') {
                        nextDate.setMonth(nextDate.getMonth() + 1)
                        if (task.recurrenceDayOfMonth) {
                            // Handle edge cases like Feb 30? JS handles overflow by moving to next month
                            nextDate.setDate(task.recurrenceDayOfMonth)
                        }
                    } else if (task.recurrenceInterval === 'yearly') {
                        nextDate.setFullYear(nextDate.getFullYear() + 1)
                    } else {
                        // Default fallback
                        nextDate.setDate(nextDate.getDate() + 1)
                    }
                }

                // Check end date
                if (task.recurrenceEndDate && nextDate > task.recurrenceEndDate) {
                    // Stop recurring, just mark completed
                    await prisma.task.update({ where: { id }, data: { completed: true } })
                } else {
                    // Reschedule: Update due date, keep completed = false
                    await prisma.task.update({
                        where: { id },
                        data: {
                            dueDate: nextDate,
                            completed: false
                        }
                    })
                }
                revalidatePath('/')
                return { success: true, rescheduled: true }
            }
        }

        await prisma.task.update({
            where: { id },
            data: { completed } // Normal completion
        })
        revalidatePath('/')
        return { success: true }

    } catch (e) {
        console.error(e)
        return { error: 'Failed to update task' }
    }
}

export async function updateTask(id: string, formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    const title = formData.get('title') as string
    const categoryId = formData.get('categoryId') as string
    const importance = formData.get('importance') as string
    const dueDateStr = formData.get('dueDate') as string

    if (!title || !categoryId) return { error: 'Title and Category are required' }

    try {
        await prisma.task.update({
            where: { id },
            data: {
                title,
                categoryId,
                description: formData.get('description') as string,
                importance: importance || 'Medium',
                dueDate: dueDateStr ? new Date(dueDateStr) : null,
                // Recurrence
                isRecurring: formData.get('isRecurring') === 'on',
                recurrenceInterval: formData.get('recurrenceInterval') as string,
                recurrenceWeekDays: formData.get('recurrenceWeekDays') as string,
                recurrenceDayOfMonth: formData.get('recurrenceDayOfMonth') ? parseInt(formData.get('recurrenceDayOfMonth') as string) : null,
                recurrenceEndDate: formData.get('recurrenceEndDate') ? new Date(formData.get('recurrenceEndDate') as string) : null,
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to update task' }
    }
}

export async function deleteTask(id: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        await prisma.task.delete({
            where: { id }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to delete task' }
    }
}

export async function shareTask(taskId: string, username: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        const userToShare = await prisma.user.findUnique({
            where: { username }
        })

        if (!userToShare) return { error: 'User not found' }

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
        return { error: 'Failed to share task' }
    }
}

export async function unshareTask(taskId: string, userIdToUnshare: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

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
        return { error: 'Failed to unshare task' }
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
                    category: { sharedWith: { some: { id: session.userId } } },
                    NOT: { creatorId: session.userId } // Avoid showing own tasks in "Shared" if category is shared
                }
            ]
        },
        include: {
            category: true,
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
    const sortReferenceDate = new Date()
    sortReferenceDate.setHours(0, 0, 0, 0)
    const nextWeek = new Date(sortReferenceDate)
    nextWeek.setDate(sortReferenceDate.getDate() + 7)

    const sortedTasks = tasks.sort((a, b) => {
        // 1. Sort by completed status first
        if (a.completed !== b.completed) return a.completed ? 1 : -1

        // Helper to get group: 1 = Next 7 Days, 2 = No Date, 3 = Future
        const getGroup = (t: typeof tasks[0]) => {
            if (!t.dueDate) return 2
            return new Date(t.dueDate) <= nextWeek ? 1 : 3
        }

        const groupA = getGroup(a)
        const groupB = getGroup(b)

        if (groupA !== groupB) return groupA - groupB

        // Within group, sort by Importance
        const pA = importanceMap[a.importance] || 2
        const pB = importanceMap[b.importance] || 2
        if (pA !== pB) return pA - pB

        // Tie breaker: Date
        if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        }
        return 0
    })

    return {
        id: 'shared-virtual',
        name: 'Shared with me',
        color: '#6366f1',
        ownerId: 'system',
        tasks: sortedTasks,
        _count: { tasks: sortedTasks.length }
    }
}

export async function deleteCompletedTasks(categoryId: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        if (categoryId === 'shared-virtual') {
            // For virtual category, delete shared tasks completed
            await prisma.task.deleteMany({
                where: {
                    completed: true,
                    OR: [
                        { sharedWith: { some: { id: session.userId } } },
                        { category: { sharedWith: { some: { id: session.userId } } } }
                    ],
                    NOT: { creatorId: session.userId }
                }
            })
        } else {
            await prisma.task.deleteMany({
                where: {
                    categoryId,
                    completed: true,
                    // Security: must be owner of category or task, or admin? 
                    // For now, let's allow if user has access to category
                }
            })
        }
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to delete completed tasks' }
    }
}
