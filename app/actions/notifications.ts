'use server'

import prisma from '@/lib/prisma'
import { getSession } from '@/lib/auth-utils'
import { revalidatePath } from 'next/cache'
import { sendTelegramMessage } from '@/lib/telegram'

export async function getNotificationSettings() {
    const session = await getSession()
    if (!session?.userId) return null

    const settings = await prisma.notificationSettings.findUnique({
        where: { userId: session.userId }
    })

    return settings
}

export async function saveNotificationSettings(formData: FormData) {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    const enabled = formData.get('enabled') === 'on'
    const telegramBotToken = formData.get('telegramBotToken') as string
    const telegramChatId = formData.get('telegramChatId') as string

    // Schedule
    const mondayTime = formData.get('mondayTime') as string || '08:00'
    const tuesdayTime = formData.get('tuesdayTime') as string || '08:00'
    const wednesdayTime = formData.get('wednesdayTime') as string || '08:00'
    const thursdayTime = formData.get('thursdayTime') as string || '08:00'
    const fridayTime = formData.get('fridayTime') as string || '08:00'
    const saturdayTime = formData.get('saturdayTime') as string || '09:00'
    const sundayTime = formData.get('sundayTime') as string || '09:00'

    try {
        await prisma.notificationSettings.upsert({
            where: { userId: session.userId },
            update: {
                enabled,
                telegramBotToken,
                telegramChatId,
                mondayTime,
                tuesdayTime,
                wednesdayTime,
                thursdayTime,
                fridayTime,
                saturdayTime,
                sundayTime
            },
            create: {
                userId: session.userId,
                enabled,
                telegramBotToken,
                telegramChatId,
                mondayTime,
                tuesdayTime,
                wednesdayTime,
                thursdayTime,
                fridayTime,
                saturdayTime,
                sundayTime
            }
        })

        revalidatePath('/admin')
        return { success: true }
    } catch (e) {
        console.error(e)
        return { error: 'Failed to save settings' }
    }
}

export async function sendTestNotification() {
    const session = await getSession()
    if (!session?.userId) return { error: 'Unauthorized' }

    const settings = await prisma.notificationSettings.findUnique({
        where: { userId: session.userId }
    })

    if (!settings || !settings.telegramChatId) {
        return { error: 'Please configure Chat ID first' }
    }

    const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
        return { error: 'No Bot Token configured (System or User)' }
    }

    const result = await sendTelegramMessage(token, settings.telegramChatId, "👋 *Hola desde Todo-Kines*\n\nSi lees esto, la configuración es correcta. Recibirás tus resúmenes diarios aquí.")

    if (result.success) {
        return { success: true }
    } else {
        return { error: result.error || 'Failed to send message' }
    }
}
