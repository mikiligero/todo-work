'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { deleteCompletedTasks } from '@/app/actions/tasks'

export function ClearCompletedButton({ projectId }: { projectId: string }) {
    const [loading, setLoading] = useState(false)

    async function handleClear() {
        if (confirm('Are you sure you want to delete all completed tasks in this project?')) {
            setLoading(true)
            await deleteCompletedTasks(projectId)
            setLoading(false)
        }
    }

    return (
        <button
            onClick={handleClear}
            disabled={loading}
            className="text-xs text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 font-medium disabled:opacity-50 cursor-pointer"
        >
            <Trash2 size={12} />
            Clear Completed
        </button>
    )
}
