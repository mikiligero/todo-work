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
    const getDayData = (day: string) => ({
        time: formData.get(`${day}Time`) as string || (day === 'saturday' || day === 'sunday' ? '09:00' : '08:00'),
        enabled: formData.get(`${day}Enabled`) === 'on'
    })

    const monday = getDayData('monday')
    const tuesday = getDayData('tuesday')
    const wednesday = getDayData('wednesday')
    const thursday = getDayData('thursday')
    const friday = getDayData('friday')
    const saturday = getDayData('saturday')
    const sunday = getDayData('sunday')

    try {
        await prisma.notificationSettings.upsert({
            where: { userId: session.userId },
            update: {
                enabled,
                telegramBotToken,
                telegramChatId,
                mondayTime: monday.time,
                mondayEnabled: monday.enabled,
                tuesdayTime: tuesday.time,
                tuesdayEnabled: tuesday.enabled,
                wednesdayTime: wednesday.time,
                wednesdayEnabled: wednesday.enabled,
                thursdayTime: thursday.time,
                thursdayEnabled: thursday.enabled,
                fridayTime: friday.time,
                fridayEnabled: friday.enabled,
                saturdayTime: saturday.time,
                saturdayEnabled: saturday.enabled,
                sundayTime: sunday.time,
                sundayEnabled: sunday.enabled
            },
            create: {
                userId: session.userId,
                enabled,
                telegramBotToken,
                telegramChatId,
                mondayTime: monday.time,
                mondayEnabled: monday.enabled,
                tuesdayTime: tuesday.time,
                tuesdayEnabled: tuesday.enabled,
                wednesdayTime: wednesday.time,
                wednesdayEnabled: wednesday.enabled,
                thursdayTime: thursday.time,
                thursdayEnabled: thursday.enabled,
                fridayTime: friday.time,
                fridayEnabled: friday.enabled,
                saturdayTime: saturday.time,
                saturdayEnabled: saturday.enabled,
                sundayTime: sunday.time,
                sundayEnabled: sunday.enabled
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
