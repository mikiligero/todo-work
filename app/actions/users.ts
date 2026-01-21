'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'


export async function searchUsers(query: string) {
    const session = await getSession()
    if (!session?.userId) return []

    if (!query || query.length < 2) return []

    return await prisma.user.findMany({
        where: {
            username: {
                contains: query
            },
            id: {
                not: session.userId // Exclude self
            }
        },
        select: {
            id: true,
            username: true
        },
        take: 5
    })
}
export async function getUsersForSharing(excludeSelf: boolean = true) {
    const session = await getSession()
    if (!session?.userId) return []

    return await prisma.user.findMany({
        where: excludeSelf ? {
            id: {
                not: session.userId // Exclude self
            }
        } : {},
        select: {
            id: true,
            username: true
        },
        orderBy: {
            username: 'asc'
        }
    })
}
