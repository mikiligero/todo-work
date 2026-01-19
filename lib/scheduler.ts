import cron from 'node-cron'
import prisma from '@/lib/prisma'
import { sendTelegramMessage } from './telegram'
import { getPendingTasks } from '@/app/actions/tasks'

// We need a way to mock session context for getPendingTasks or reimplement the query...
// Implementing a customized query for the scheduler is safer as it runs without a user session context.

async function checkAndSendNotifications() {
    const now = new Date()
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() // monday, tuesday...
    const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) // HH:MM

    try {
        // 1. Find users with notifications enabled
        const usersWithSettings = await prisma.user.findMany({
            where: {
                notificationSettings: {
                    enabled: true
                }
            },
            include: {
                notificationSettings: true
            }
        })

        for (const user of usersWithSettings) {
            const settings = user.notificationSettings
            if (!settings) continue

            // 2. Check Schedule
            // Map day to field name: mondayTime, tuesdayTime...
            const timeField = `${currentDay}Time` as keyof typeof settings
            const enabledField = `${currentDay}Enabled` as keyof typeof settings
            const scheduledTime = settings[timeField]
            const isDayEnabled = settings[enabledField]

            if (isDayEnabled && scheduledTime === currentTime) {
                // 3. Check Throttling (avoid sending multiple times within the same minute if cron overlaps, or same day)
                // Actually we just want to ensure we sent it "today". 
                // Using lastSentAt.
                if (settings.lastSentAt) {
                    const lastSent = new Date(settings.lastSentAt)
                    if (lastSent.toDateString() === now.toDateString()) {
                        continue // Already sent today
                    }
                }

                // 4. Gather Data
                await sendDailyDigest(user.id, settings.telegramBotToken, settings.telegramChatId)

                // 5. Update lastSentAt
                await prisma.notificationSettings.update({
                    where: { id: settings.id },
                    data: { lastSentAt: now }
                })
            }
        }
    } catch (error) {
        console.error('Scheduler Error:', error)
    }
}

async function sendDailyDigest(userId: string, botToken: string | null, chatId: string | null) {
    if (!chatId) return

    // Allow user override, or use system default (env var)
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN
    if (!token) {
        console.error(`No bot token available for user ${userId}`)
        return
    }

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999)
    const nextWeek = new Date(); nextWeek.setDate(nextWeek.getDate() + 7)

    // Fetch tasks
    const tasks = await prisma.task.findMany({
        where: {
            OR: [
                { creatorId: userId },
                { assigneeId: userId },
                { sharedWith: { some: { id: userId } } },
                { category: { sharedWith: { some: { id: userId } } } }
            ],
            completed: false
        }
    })

    const expiringToday = tasks.filter(t => t.dueDate && t.dueDate >= todayStart && t.dueDate <= todayEnd)
    const upcoming = tasks.filter(t => t.dueDate && t.dueDate > todayEnd && t.dueDate <= nextWeek)

    // High priority: tasks with importance 'High' AND NO DATE
    // (If they have a date, they are already in expiringToday or upcoming, or ignored if > 7 days)
    const highPriorityNoDate = tasks.filter(t => t.importance === 'High' && !t.dueDate)

    if (expiringToday.length === 0 && upcoming.length === 0 && highPriorityNoDate.length === 0) {
        return
    }

    let message = `🌅 *Resumen Diario Todo-Kines*\n\n`

    // Section 1: Next 7 Days (Today + Upcoming)
    // We can merge them for "Próximos 7 días" or keep "Vencen Hoy" for urgency.
    // Let's keep "Vencen Hoy" separate for emphasis, then "Próximos 7 días" for the rest.

    if (expiringToday.length > 0) {
        message += `🚨 *Vencen Hoy:*\n`
        expiringToday.forEach(t => message += `• ${t.title}\n`)
        message += `\n`
    }

    if (upcoming.length > 0) {
        message += `📅 *Próximos 7 días:*\n`
        upcoming.forEach(t => {
            const dateStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''
            message += `• ${t.title} (${dateStr})\n`
        })
        message += `\n`
    }

    if (highPriorityNoDate.length > 0) {
        message += `🔥 *Prioridad Alta (Sin Fecha):*\n`
        highPriorityNoDate.forEach(t => message += `• ${t.title}\n`)
    }

    await sendTelegramMessage(token, chatId, message)
}

export function initScheduler() {
    // Run every minute
    cron.schedule('* * * * *', () => {
        checkAndSendNotifications()
    })
    console.log('Scheduler initialized')
}
