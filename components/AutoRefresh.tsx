'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function AutoRefresh() {
    const router = useRouter()

    useEffect(() => {
        const interval = setInterval(() => {
            router.refresh()
        }, 60000) // 1 minute

        return () => clearInterval(interval)
    }, [router])

    return null
}
