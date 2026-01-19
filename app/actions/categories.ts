'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'


export async function getCategories() {
    const session = await getSession()
    if (!session?.userId) return []

    return await prisma.category.findMany({
        where: {
            OR: [
                { ownerId: session.userId },
                { sharedWith: { some: { id: session.userId } } }
            ]
        },
        include: {
            _count: {
                select: { tasks: { where: { completed: false } } }
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

export async function createCategory(formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    const name = formData.get('name') as string
    const color = formData.get('color') as string

    if (!name) return { error: 'Name is required' }

    try {
        await prisma.category.create({
            data: {
                name,
                color: color || '#6366f1', // Default Indigo
                ownerId: session.userId,
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to create category' }
    }
}

export async function updateCategory(id: string, formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

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
        await prisma.category.update({
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
        return { error: 'Failed to update category' }
    }
}

export async function deleteCategory(id: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        // Only owner can delete
        await prisma.category.delete({
            where: {
                id,
                ownerId: session.userId
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to delete category' }
    }
}

export async function getCategoryWithTasks(id: string) {
    const session = await getSession()
    if (!session?.userId) return null

    const category = await prisma.category.findUnique({
        where: {
            id,
            OR: [
                { ownerId: session.userId },
                { sharedWith: { some: { id: session.userId } } }
            ]
        },
        include: {
            owner: {
                select: { username: true }
            },
            sharedWith: {
                select: { id: true, username: true }
            },
            tasks: {
                include: {
                    subtasks: {
                        orderBy: { createdAt: 'asc' }
                    },
                    category: true,
                    creator: {
                        select: { username: true }
                    },
                    sharedWith: {
                        select: { id: true, username: true }
                    }
                }
            }
        }
    })

    if (!category) return null

    const importanceMap: Record<string, number> = { 'High': 1, 'Medium': 2, 'Low': 3 }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const nextWeek = new Date(today)
    nextWeek.setDate(today.getDate() + 7)

    category.tasks.sort((a, b) => {
        // 1. Keep pending tasks first
        if (a.completed !== b.completed) return a.completed ? 1 : -1

        // Helper to get group: 1 = Next 7 Days, 2 = No Date, 3 = Future
        const getGroup = (t: typeof category.tasks[0]) => {
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

    return category
}
