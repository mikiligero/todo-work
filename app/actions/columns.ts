'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

export async function createColumn(projectId: string, title: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        // Get max order
        const lastCol = await prisma.kanbanColumn.findFirst({
            where: { projectId },
            orderBy: { order: 'desc' }
        })
        const order = lastCol ? lastCol.order + 1 : 0

        const column = await prisma.kanbanColumn.create({
            data: {
                title,
                projectId,
                order
            }
        })
        revalidatePath(`/project/${projectId}`)
        return { success: true, column }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to create column' }
    }
}

export async function deleteColumn(columnId: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        await prisma.kanbanColumn.delete({
            where: { id: columnId }
        })
        // Note: Tasks with this columnId will have it set to null due to SetNull
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to delete column' }
    }
}

export async function updateColumn(columnId: string, title: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        await prisma.kanbanColumn.update({
            where: { id: columnId },
            data: { title }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to update column' }
    }
}
