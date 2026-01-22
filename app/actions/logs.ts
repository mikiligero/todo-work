'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'

export async function createTaskLog(taskId: string, content: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    if (!content.trim()) return { error: 'Content is required' }

    try {
        await prisma.taskLog.create({
            data: {
                content,
                taskId,
                userId: session.userId
            }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to create log' }
    }
}

export async function updateTaskLog(id: string, content: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        // Optional: Check if user owns the log? 
        // For now, allow any authorized user with access (we assume UI handles visibility)
        await prisma.taskLog.update({
            where: { id },
            data: { content }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to update log' }
    }
}

export async function deleteTaskLog(id: string) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    try {
        await prisma.taskLog.delete({
            where: { id }
        })
        revalidatePath('/')
        return { success: true }
    } catch (e) {
        return { error: 'Failed to delete log' }
    }
}
