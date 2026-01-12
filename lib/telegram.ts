export async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
    if (!botToken || !chatId) {
        console.error('Missing bot token or chat ID')
        return { success: false, error: 'Missing configuration' }
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            }),
        })

        const data = await response.json()

        if (!data.ok) {
            console.error('Telegram API Error:', data)
            return { success: false, error: data.description }
        }

        return { success: true }
    } catch (error) {
        console.error('Failed to send Telegram message:', error)
        return { success: false, error: 'Network error' }
    }
}
